// 🎯 口味限制全球唯一變數，防止重複宣告報錯
if (typeof window.myGlobalDisabledFlavors === 'undefined') {
    window.myGlobalDisabledFlavors = [];
}

// 🌐 宣告全域日期配置變數（備用本地名單）
window.locationConfig = {
    lehua: { blacklist: { dates: ["2026-05-09", "2026-04-18", "2026-04-25"], ranges: [] } },
    shilin: { blacklist: { dates: ["2026-03-31", "2026-05-09"], ranges: [] } },
    sanchong: {
        blacklist: {
            dates: [],
            ranges: [
                { start: "2025-10-08", end: "2025-10-30" },
                { start: "2025-11-01", end: "2025-11-06" },
                { start: "2025-11-09", end: "2026-03-29" },
                { start: "2026-04-01", end: "2026-04-17" },
                { start: "2026-04-19", end: "2026-04-24" },
                { start: "2026-04-26", end: "2026-05-08" },
                { start: "2026-05-10", end: "2099-05-24" }
            ]
        }
    },
    sanchongMorning: { whitelist: ["2026-03-28", "2026-04-25", "2026-05-09"] }
};

// 🎯 負責接收 Google 試算表傳回來的 JSONP 資料
window.handleJsonpConfig = function (onlineConfig) {
    window.locationConfig = onlineConfig;
    console.log("🎉 成功透過 JSONP 動態載入最新的線上日期限定配置！", window.locationConfig);

    setTimeout(() => {
        const currentEventDate = document.getElementById("eventDate")?.value;
        if (currentEventDate && typeof window.updateAvailableLocations === 'function') {
            window.updateAvailableLocations(currentEventDate);
        }
    }, 100);
};

// 🎯 收集各口味數量（英文 id 作為 key，與 GAS flavorRowMap 對應）
function getFlavorMap() {
    const ids = [
        "qtyDuoDuo", "qtyGrape", "qtyLychee", "qtyPassionFruit", "qtyStrawberry",
        "qtyApple", "qtyPineapple", "qtyOrange", "qtyPeach", "qtyMango"
    ];
    const flavors = {};
    ids.forEach(id => {
        const v = parseInt(document.getElementById(id)?.value, 10) || 0;
        if (v > 0) flavors[id] = v;
    });
    return flavors;
}

document.addEventListener("DOMContentLoaded", function () {
    const orderForm = document.getElementById("orderForm");
    if (orderForm) {
        orderForm.setAttribute("novalidate", "true");
        orderForm.reset();
    }

    const initialSubmitBtn = document.querySelector("input[type='submit']");
    if (initialSubmitBtn) initialSubmitBtn.value = "前往確認";

    document.querySelectorAll("input[name='pickupLocation']").forEach(radio => {
        radio.dataset.clicked = "false";
        // ✅ 初始狀態：尚未選日期，先把每張取貨地點卡片隱藏起來
        const cardContainer = radio.closest(".pickup-option") || radio.parentElement?.parentElement;
        if (cardContainer) cardContainer.style.display = "none";
    });
    const totalCountTextEl = document.getElementById("totalCountText");
    if (totalCountTextEl) totalCountTextEl.innerHTML = "";

    // 🚀 【JSONP 啟動器（含失敗自動重試）】
    function fetchOnlineLocationConfigViaJsonp(retryCount) {
        retryCount = retryCount || 0;
        const maxRetries = 2;             // 最多再重試 2 次
        const retryDelays = [1500, 3000]; // 第 1 次失敗等 1.5 秒、第 2 次等 3 秒

        const baseUrl = "https://script.google.com/macros/s/AKfycbxuvO5OjaPocqyCdR2gNPbO_yV0jcOp7QK1aEODgNvBKEOQa-bgmiVwpmoM2K0D0l2N/exec";
        const script = document.createElement("script");
        script.src = `${baseUrl}?_=${new Date().getTime()}`;

        // 載入成功後把這個暫時用的 script 標籤移除，保持乾淨
        script.onload = function () {
            if (script.parentNode) script.parentNode.removeChild(script);
        };

        script.onerror = function () {
            if (script.parentNode) script.parentNode.removeChild(script);
            if (retryCount < maxRetries) {
                const delay = retryDelays[retryCount];
                console.warn(`線上日期設定檔連線失敗，${delay / 1000} 秒後自動重試（第 ${retryCount + 1} 次）…`);
                setTimeout(() => fetchOnlineLocationConfigViaJsonp(retryCount + 1), delay);
            } else {
                console.warn("線上日期設定檔多次連線失敗，系統將以程式內預設的備用配置運行。");
            }
        };

        document.body.appendChild(script);
    }

    fetchOnlineLocationConfigViaJsonp();

    // 🎯 【全部隱藏取貨地點】小工具：把每張卡片都藏起來，並取消已勾選的
    function hideAllPickupLocations() {
        document.querySelectorAll("input[name='pickupLocation']").forEach(radio => {
            const cardContainer = radio.closest(".pickup-option") || radio.parentElement?.parentElement;
            if (cardContainer) {
                cardContainer.style.display = "none";
            }
            radio.checked = false;
            radio.dataset.clicked = "false";
        });
    }

    // 🎯 【精準 Radio 卡片定位隱藏邏輯】
    window.updateAvailableLocations = function (selectedDateStr) {
        if (!window.locationConfig) return;

        // ✅ 規則：活動日期或取貨日期任一沒填，就全部隱藏，不再往下計算
        const eventDateVal = document.getElementById("eventDate")?.value;
        const pickupDateVal = document.getElementById("pickupDate")?.value;
        if (!eventDateVal || !pickupDateVal) {
            hideAllPickupLocations();
            return;
        }

        const selectedDate = new Date(selectedDateStr);
        selectedDate.setHours(0, 0, 0, 0);

        function formatDate防呆(str) {
            if (!str) return "";
            try {
                const d = new Date(str);
                if (isNaN(d.getTime())) return str.toString().trim();
                let y = d.getFullYear();
                let m = String(d.getMonth() + 1).padStart(2, '0');
                let day = String(d.getDate()).padStart(2, '0');
                return `${y}-${m}-${day}`;
            } catch (e) {
                return str.toString().trim();
            }
        }

        const cleanSelectedDateStr = formatDate防呆(selectedDateStr);

        // 各個 ID 對應到 HTML 中 Radio 的真實 value 中文字眼
        const matchValueNames = {
            lehua: "樂華店",
            shilin: "士林店",
            sanchong: "三重取貨點",
            sanchongMorning: "三重取貨點（早上）"
        };

        const visibilityStatus = { lehua: true, shilin: true, sanchong: true, sanchongMorning: false };

        // 1. 計算線上最新的顯隱狀態
        Object.keys(matchValueNames).forEach(key => {
            if (key === "sanchongMorning") {
                const pickupDateStr = document.getElementById("pickupDate")?.value;
                const eventDateStr = document.getElementById("eventDate")?.value;
                const rawWhiteList = window.locationConfig.sanchongMorning?.whitelist || [];
                const whiteList = rawWhiteList.map(d => formatDate防呆(d));

                if (
                    pickupDateStr && eventDateStr &&
                    formatDate防呆(pickupDateStr) === formatDate防呆(eventDateStr) &&
                    whiteList.includes(formatDate防呆(pickupDateStr))
                ) {
                    visibilityStatus.sanchongMorning = true;
                }
                return;
            }

            const config = window.locationConfig[key];
            if (!config || !config.blacklist) return;
            const { blacklist } = config;

            if (blacklist.dates && blacklist.dates.length > 0) {
                const cleanDates = blacklist.dates.map(d => formatDate防呆(d));
                if (cleanDates.includes(cleanSelectedDateStr)) {
                    visibilityStatus[key] = false;
                }
            }
            if (visibilityStatus[key] && blacklist.ranges && blacklist.ranges.length > 0) {
                for (let range of blacklist.ranges) {
                    const start = new Date(range.start); start.setHours(0, 0, 0, 0);
                    const end = new Date(range.end); end.setHours(0, 0, 0, 0);
                    if (selectedDate >= start && selectedDate <= end) {
                        visibilityStatus[key] = false;
                        break;
                    }
                }
            }
        });

        // 2. 核心控制：直接抓取網頁上所有取貨地點的 Radio 按鈕進行卡片控制
        const allRadioButtons = document.querySelectorAll("input[name='pickupLocation']");
        allRadioButtons.forEach(radio => {
            const radioValue = radio.value; // 例如："樂華店"

            Object.keys(matchValueNames).forEach(key => {
                if (radioValue === matchValueNames[key]) {
                    // 向上尋找最接近的白底卡片容器（通常是 .pickup-option 或者其父級 div）
                    const cardContainer = radio.closest(".pickup-option") || radio.parentElement?.parentElement;

                    if (cardContainer) {
                        // 根據最新的狀態，直接對整張卡片進行顯示或物理隱藏！
                        cardContainer.style.display = visibilityStatus[key] ? "flex" : "none";

                        // 防呆：如果原本勾選的門市被隱藏了，自動取消勾選
                        if (!visibilityStatus[key] && radio.checked) {
                            radio.checked = false;
                        }
                    }
                }
            });
        });
    };

    // Initialize flatpickr for event date, pickup date, and pickup time
    const eventDatePicker = flatpickr("#eventDate", {
        disableMobile: "true",
        dateFormat: "Y-m-d",
        minDate: "today",
        maxDate: new Date().fp_incr(180),
        onChange: function (selectedDates, dateStr, instance) {
            if (!dateStr || selectedDates.length === 0) return;

            const eventDate = selectedDates[0];
            const minPickupDate = new Date(eventDate);
            minPickupDate.setDate(eventDate.getDate() - 1);

            pickupDatePicker.set("minDate", minPickupDate);
            pickupDatePicker.set("maxDate", eventDate);
            pickupDatePicker.setDate(minPickupDate, true);

            window.updateAvailableLocations(dateStr);
        }
    });

    const pickupDatePicker = flatpickr("#pickupDate", {
        disableMobile: "true",
        dateFormat: "Y-m-d"
    });

    flatpickr("#pickupTime", {
        disableMobile: "true",
        enableTime: true,
        noCalendar: true,
        dateFormat: "H:i",
        time_24hr: true,
        minTime: "00:00",
        maxTime: "23:59",
        onOpen: function (selectedDates, dateStr, instance) {
            const location = document.querySelector("input[name='pickupLocation']:checked")?.value;
            if (!location) {
                instance.set("minTime", null);
                instance.set("maxTime", null);
                return;
            }
            if (location === "樂華店") {
                instance.set("minTime", "16:40");
                instance.set("maxTime", "22:00");
            } else if (location === "士林店") {
                instance.set("minTime", "18:00");
                instance.set("maxTime", "22:00");
            } else if (location === "三重取貨點") {
                instance.set("minTime", "14:00");
                instance.set("maxTime", "17:30");
            } else if (location === "三重取貨點（早上）") {
                instance.set("minTime", "08:00");
                instance.set("maxTime", "09:00");
            } else {
                instance.set("minTime", "00:00");
                instance.set("maxTime", "23:59");
            }
        }
    });

    let eventDateInput = document.getElementById("eventDate");
    if (eventDateInput) {
        eventDateInput.addEventListener("change", function () {
            setTimeout(() => {
                if (!this.value) return;
                let eventDate = parseLocalDate(this.value);
                eventDate.setHours(0, 0, 0, 0);
                let today = new Date();
                today.setHours(0, 0, 0, 0);
                let maxDate = new Date();
                maxDate.setDate(today.getDate() + 180);
                if (eventDate < today || eventDate > maxDate) {
                    alert("請選擇今天到 180 天內的日期");
                    this.value = "";
                    return;
                }
                let minPickupDate = new Date(eventDate);
                minPickupDate.setDate(eventDate.getDate() - 1);
                let pickupDateInput = document.getElementById("pickupDate");
                if (pickupDateInput && !isNaN(minPickupDate.getTime())) {
                    let y = minPickupDate.getFullYear();
                    let m = String(minPickupDate.getMonth() + 1).padStart(2, '0');
                    let d = String(minPickupDate.getDate()).padStart(2, '0');

                    pickupDateInput.setAttribute("min", `${y}-${m}-${d}`);
                    pickupDateInput.setAttribute("max", this.value);
                }
                window.updateAvailableLocations(this.value);
            }, 1500);
        });
    }

    let pickupDateInput = document.getElementById("pickupDate");
    if (pickupDateInput) {
        pickupDateInput.addEventListener("change", function () {
            setTimeout(() => {
                if (!this.value) return;
                let selectedDate = parseLocalDate(this.value);
                selectedDate.setHours(0, 0, 0, 0);
                let eventDate = new Date(eventDateInput.value);
                eventDate.setHours(0, 0, 0, 0);
                let minPickupDate = new Date(eventDate);
                minPickupDate.setDate(eventDate.getDate() - 1);
                if (selectedDate < minPickupDate || selectedDate > eventDate) {
                    alert("請選擇活動日期前一日至活動當天的日期");
                    this.value = "";
                }
                window.updateAvailableLocations(eventDateInput.value);
                let pickupTimeFlatpickr = document.querySelector("#pickupTime")?._flatpickr;
                if (pickupTimeFlatpickr) {
                    pickupTimeFlatpickr.setDate(pickupTimeFlatpickr.input.value, true);
                }
            }, 500);
        });
    }

    let phoneNumberInput = document.getElementById("phoneNumber");
    if (phoneNumberInput) {
        phoneNumberInput.addEventListener("input", function () {
            this.value = this.value.replace(/\D/g, "");
        });
    }

    document.querySelectorAll(".pickup-option input[type='radio']").forEach(radio => {
        radio.addEventListener("click", function () {
            document.querySelectorAll("input[name='pickupLocation']").forEach(r => {
                r.dataset.clicked = "false";
            });
            this.dataset.clicked = "true";
            const pickupTimeInput = document.getElementById("pickupTime");
            const selectedTime = pickupTimeInput?.value;
            if (pickupTimeInput && selectedTime) {
                const isValid = validatePickupTime(this.value, selectedTime, true);
                if (!isValid) {
                    alert(getPickupNotification(this.value));
                    pickupTimeInput.value = "";
                }
                pickupTimeInput.dataset.valid = isValid ? "true" : "false";
            }
        });
    });

    document.getElementById("invoiceNumber")?.addEventListener("input", function () {
        this.value = this.value.replace(/\D/g, "");
    });

    document.querySelectorAll(".flavor-item input[type='text']").forEach(input => {
        input.addEventListener("input", function () {
            this.value = this.value.replace(/\D/g, "");
            document.querySelectorAll(".flavor-item .reminder-text").forEach(r => r.remove());
            this.style.border = "";
            calculateTotal();
        });
        input.addEventListener("blur", function () {
            this.value = this.value.replace(/\D/g, "");
            document.querySelectorAll(".flavor-item .reminder-text").forEach(r => r.remove());
            this.style.border = "";
            calculateTotal();
        });
    });

    function getOrderDetails() {
        const flavorData = [
            { name: "多多", id: "qtyDuoDuo" }, { name: "葡萄", id: "qtyGrape" }, { name: "荔枝", id: "qtyLychee" },
            { name: "百香果", id: "qtyPassionFruit" }, { name: "草莓", id: "qtyStrawberry" }, { name: "蘋果", id: "qtyApple" },
            { name: "鳳梨", id: "qtyPineapple" }, { name: "柳橙", id: "qtyOrange" }, { name: "水蜜桃", id: "qtyPeach" }, { name: "芒果", id: "qtyMango" }
        ];
        let orderDetails = "";
        let totalCount = 0;
        let totalPrice = 0;
        flavorData.forEach(flavor => {
            let quantity = parseInt(document.getElementById(flavor.id)?.value) || 0;
            if (quantity > 0) {
                orderDetails += `${flavor.name}：${quantity} 枝\n`;
                totalCount += quantity;
                totalPrice += quantity * 15;
            }
        });
        return { orderDetails, totalCount, totalPrice };
    }

    document.getElementById("orderForm").addEventListener("submit", async function (event) {
        event.preventDefault();
        let requiredFields = [
            { id: "customerName" }, { id: "phoneNumber" }, { id: "orderSchool" },
            { id: "orderClass" }, { id: "eventDate" }, { id: "pickupDate" }, { id: "pickupTime" }
        ];
        let hasError = false;

        requiredFields.forEach(field => {
            let input = document.getElementById(field.id);
            if (!input || !input.value.trim()) {
                hasError = true;
                if (input) input.style.border = "2px solid red";
            } else {
                if (input) input.style.border = "";
            }
        });

        let pickupLocationElement = document.querySelector("input[name='pickupLocation']:checked");
        let pickupWrapper = document.querySelector(".pickup-options-wrapper");
        if (!pickupLocationElement) {
            hasError = true;
            if (pickupWrapper) {
                pickupWrapper.style.border = "2px solid red";
                pickupWrapper.style.borderRadius = "10px";
                pickupWrapper.style.padding = "10px";
            }
        } else {
            if (pickupWrapper) pickupWrapper.style.border = "";
        }

        if (hasError) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        pickupLocationElement.dataset.clicked = "true";

        const customerName = document.getElementById("customerName").value.trim();
        const phoneNumber = document.getElementById("phoneNumber").value.trim();
        const orderSchool = document.getElementById("orderSchool").value.trim();
        const orderClass = document.getElementById("orderClass").value.trim();
        const orderUnit = `${orderSchool} ${orderClass}`;
        const eventDate = document.getElementById("eventDate").value.trim();
        const invoiceTitle = document.getElementById("invoiceTitle").value.trim();
        const invoiceNumber = document.getElementById("invoiceNumber").value.trim();
        const pickupLocation = pickupLocationElement.value;
        const pickupDate = document.getElementById("pickupDate").value.trim();
        const pickupTime = document.getElementById("pickupTime").value.trim();

        const pickupTimeInput = document.getElementById("pickupTime");
        if (!validatePickupTime(pickupLocation, pickupTime, true)) {
            alert("請確認您輸入的取貨時間是否正確喔！");
            if (pickupTimeInput) {
                pickupTimeInput.style.border = "2px solid red";
                pickupTimeInput.focus();
            }
            return;
        }
        const pickupDateObj = parseLocalDate(pickupDate);
        const eventDateObj = parseLocalDate(eventDate);
        const minPickupDate = new Date(eventDateObj);
        minPickupDate.setDate(eventDateObj.getDate() - 1);
        if (pickupDateObj < minPickupDate || pickupDateObj > eventDateObj) {
            alert("請選擇活動日期前一日到活動當天的日期");
            document.getElementById("pickupDate").style.border = "2px solid red";
            return;
        }

        const { orderDetails, totalCount, totalPrice } = getOrderDetails();
        const calculatedCount = Math.ceil(totalCount / 1.1);
        const bonusCount = Math.floor(calculatedCount / 10);
        const adjustedPrice = totalPrice - bonusCount * 15;

        if (totalCount === 0) {
            alert(`請填寫欲訂購的口味及數量喔😊`);
            return;
        }

        // 模具版：最低訂購量需達 165 枝（含）以上
        if (totalCount < 165) {
            alert(`總枝數 ${totalCount} 枝未達最低訂購量 165 枝，請再增加 ${165 - totalCount} 枝喔😊`);
            return;
        }

        if ((calculatedCount + bonusCount) !== totalCount) {
            const diff = (calculatedCount + bonusCount) - totalCount;
            alert(`若要購買 ${calculatedCount} 枝，贈送 ${bonusCount} 枝。請再挑選 ${diff} 枝。`);
            return;
        }

        const remainder = calculatedCount % 10;
        if (remainder !== 0) {
            const needed = 10 - remainder;
            const stayToBuyMore = await new Promise((resolve) => {
                const upsellOverlay = document.createElement("div");
                upsellOverlay.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; align-items: center; justify-content: center;";

                upsellOverlay.innerHTML = `
                    <div style="background: white; padding: 25px; border-radius: 12px; width: 85%; max-width: 400px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
                        <h3 style="margin-top: 0; color: #ff6600;">✨ 差一點點就多送一枝！</h3>
                        <p style="font-size: 16px; line-height: 1.6;">再 <b style="color:red; font-size: 20px;">${needed}</b> 枝就再<b>加送 1 枝</b>喔！</p>
                        <div style="display: flex; gap: 10px; margin-top: 20px;">
                            <button id="goNext" style="flex: 1; padding: 12px; border: 1px solid #ccc; background: #f9f9f9; border-radius: 6px; cursor: pointer; line-height: 1.4;">不需更改<br>前往確認頁</button>
                            <button id="backToOrder" style="flex: 1; padding: 12px; border: none; background: #ff6600; color: white; border-radius: 6px; cursor: pointer; font-weight: bold; line-height: 1.4;">馬上去選<br>${needed + 1} 枝</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(upsellOverlay);

                upsellOverlay.querySelector("#goNext").onclick = () => {
                    document.body.removeChild(upsellOverlay);
                    resolve(false);
                };
                upsellOverlay.querySelector("#backToOrder").onclick = () => {
                    document.body.removeChild(upsellOverlay);
                    resolve(true);
                };
            });
            if (stayToBuyMore) return;
        }

        const gasUrl = "https://script.google.com/macros/s/AKfycbzE7wP4x3S5k9BOpooS7VkiYMPYdPP2Wx9KDWaOnXZ5GLtWqE1OCHnBnjIy8jQQdWjK/exec";
        const submitBtn = event.submitter || document.querySelector("input[type='submit']");
        submitBtn.disabled = true;
        const originalBtnText = submitBtn.value;
        submitBtn.value = "正在核對產能中...";

        try {
            const checkResponse = await fetch(gasUrl, {
                method: "POST",
                body: JSON.stringify({
                    eventDate: eventDate,
                    totalCount: totalCount,
                    orderType: "mold",
                    flavors: getFlavorMap()
                })
            });
            const checkResult = await checkResponse.json();
            if (checkResult.status === "error") {
                alert(checkResult.message);
                submitBtn.disabled = false;
                submitBtn.value = originalBtnText;
                return;
            }
        } catch (error) {
            alert("系統連線異常，請稍後再試。");
            submitBtn.disabled = false;
            submitBtn.value = originalBtnText;
            return;
        }
        submitBtn.disabled = false;
        submitBtn.value = originalBtnText;

        let confirmationMessage = `請確認您的訂單資訊，若正確無誤請點選右下方"送出"：\n\n\n`;
        confirmationMessage += `📌 訂購人姓名：${customerName}\n\n`;
        confirmationMessage += `📞 聯絡電話：${phoneNumber}\n\n`;
        confirmationMessage += `🏫 訂購單位：${orderUnit}\n\n`;
        confirmationMessage += `📅 活動日期：${eventDate}\n\n`;
        if (invoiceTitle) confirmationMessage += `🧾 收據抬頭：${invoiceTitle}\n\n`;
        if (invoiceNumber) confirmationMessage += `💳 統一編號：${invoiceNumber}\n\n`;
        confirmationMessage += `✮✯✮✯✮✯✮\n\n`;
        confirmationMessage += `🏬 取貨地點：${pickupLocation}\n\n`;
        confirmationMessage += `🏬 取貨日期：${pickupDate}\n\n`;
        confirmationMessage += `⏰ 取貨時間：${pickupTime}\n\n`;
        confirmationMessage += `--\n`;
        confirmationMessage += `🛒 訂購內容：\n${orderDetails}\n\n`;
        confirmationMessage += `🛒 總枝數：${totalCount} 枝，共 ${adjustedPrice} 元。\n\n`;
        confirmationMessage += ` ⤷ 訂購 ${calculatedCount} 枝 + 贈送 ${bonusCount} 枝。\n`;

        let confirmBox = document.createElement("div");
        confirmBox.style = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #fff; padding: 20px; border-radius: 10px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.2); width: 90%; max-width: 500px;
            max-height: 80vh; overflow-y: auto; z-index: 1000; text-align: left;
        `;
        let messageText = document.createElement("p");
        messageText.style = "font-size: 16px; white-space: pre-line;";
        messageText.textContent = confirmationMessage;
        let buttonContainer = document.createElement("div");
        let cancelButton = document.createElement("button");
        cancelButton.textContent = "返回";
        cancelButton.style = "background: #ccc; color: #000; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;";
        cancelButton.onclick = () => {
            document.body.removeChild(confirmBox);
            document.body.removeChild(overlay);
        };
        let finalSubmitButton = document.createElement("button");
        finalSubmitButton.textContent = "送出";
        finalSubmitButton.style = "background: #ff6600; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;";

        finalSubmitButton.onclick = () => {
            document.body.removeChild(confirmBox);
            document.body.removeChild(overlay);

            const formData = new FormData();
            formData.append("entry.81239836", customerName);
            formData.append("entry.1416157379", phoneNumber);
            formData.append("entry.1025003389", orderUnit);
            formData.append("entry.466185296", invoiceTitle);
            formData.append("entry.130292631", invoiceNumber);
            formData.append("entry.986842072", eventDate);
            formData.append("entry.623556672", pickupLocation);
            formData.append("entry.1087301355", pickupDate);
            formData.append("entry.392904427", pickupTime);
            formData.append("entry.1464986341", document.getElementById("qtyDuoDuo").value || "0");
            formData.append("entry.1379523760", document.getElementById("qtyGrape").value || "0");
            formData.append("entry.1921139293", document.getElementById("qtyLychee").value || "0");
            formData.append("entry.2095163395", document.getElementById("qtyPassionFruit").value || "0");
            formData.append("entry.1453269351", document.getElementById("qtyStrawberry").value || "0");
            formData.append("entry.8702968", document.getElementById("qtyApple").value || "0");
            formData.append("entry.966346636", document.getElementById("qtyPineapple").value || "0");
            formData.append("entry.641811555", document.getElementById("qtyOrange").value || "0");
            formData.append("entry.220818810", document.getElementById("qtyPeach").value || "0");
            formData.append("entry.995091122", document.getElementById("qtyMango").value || "0");

            fetch("https://docs.google.com/forms/d/e/1FAIpQLSfPPhdVADqqCp_LSx5tlI_QOLrlRDfNJpKLjKId9WFkk3zU2Q/formResponse", {
                method: "POST", mode: "no-cors", body: formData
            });

            // 清空表單狀態
            document.getElementById("orderForm").reset();
            document.querySelectorAll("input[name='pickupLocation']").forEach(radio => {
                radio.checked = false;
                radio.dataset.clicked = "false";
            });
            window.calculatedCount = 0;
            window.promoValid = true;
            updatePromoMessage();
            calculateTotal();

            // ✅ 依「網址 v 參數」+「總金額是否 ≥ 1000」決定跳轉的成功頁
            // 金額 ≥ 1000 → DEP 開頭；金額 < 1000 → NR 開頭
            const isHighAmount = adjustedPrice >= 1000;
            const urlParams = new URLSearchParams(window.location.search);
            const source = urlParams.get('v');
            const baseSuccessUrl = "https://qqbar2013.github.io/form/success/";
            const validSources = ["lH4m8Q5v", "sL9x7P2k", "mL3w6R9j"];

            if (source && validSources.includes(source)) {
                const prefix = isHighAmount ? "DEP" : "NR";
                window.location.href = `${baseSuccessUrl}${prefix}${source}.html`;
            } else {
                // 沒有 v 參數或不認得 → 停在原頁、回到頂部
                window.scrollTo(0, 0);
            }
        };

        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(finalSubmitButton);
        confirmBox.appendChild(messageText);
        buttonContainer.style = "display: flex; justify-content: space-between; margin-top: 20px;";
        confirmBox.appendChild(buttonContainer);
        const overlay = document.createElement("div");
        overlay.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.3); z-index: 999;";
        document.body.appendChild(overlay);
        document.body.appendChild(confirmBox);
    });

    function calculateTotal() {
        let totalCount = 0;
        const flavorIds = [
            "qtyDuoDuo", "qtyGrape", "qtyLychee", "qtyPassionFruit", "qtyStrawberry",
            "qtyApple", "qtyPineapple", "qtyOrange", "qtyPeach", "qtyMango"
        ];
        flavorIds.forEach(id => {
            const el = document.getElementById(id);
            let qty = el ? (parseInt(el.value) || 0) : 0;
            totalCount += qty;
        });

        let calculatedCount = Math.ceil(totalCount / 1.1);
        let bonusCount = Math.floor(calculatedCount / 10);
        window.calculatedCount = calculatedCount;

        let isValid = (calculatedCount + bonusCount) === totalCount;
        let hasInput = totalCount > 0;
        let totalPrice = totalCount * 15 - bonusCount * 15;

        let displayText = `<div class="total-summary">`;
        if (totalCount > 0) {
            displayText += `<div class="total-row">總枝數: ${totalCount} 枝。</div><br>`;
        }
        if (!isValid) {
            let suggestedBuy = calculatedCount;
            let suggestedBonus = Math.floor(suggestedBuy / 10);
            let difference = (suggestedBuy + suggestedBonus) - totalCount;
            displayText += `<div class="total-row error-text">
                若要購買 ${suggestedBuy} 枝，贈送 ${suggestedBonus} 枝。請再挑選 ${difference} 枝。
            </div>`;
            const totalCountTextEl = document.getElementById("totalCountText");
            if (totalCountTextEl) totalCountTextEl.innerHTML = displayText;
            window.promoValid = false;
            updatePromoMessage();
            return;
        }

        window.promoValid = true;
        if (hasInput) {
            displayText += `<div class="total-sub" style="color: red; font-weight: bold; margin: 0;">
                ⤷ 訂購 ${calculatedCount} 枝 + 贈送 ${bonusCount} 枝。
            </div>`;
        }
        if (totalCount > 0) {
            displayText += `<div class="total-row">總金額: ${totalPrice} 元。</div>`;
        }
        displayText += `</div>`;
        const totalCountTextEl = document.getElementById("totalCountText");
        if (totalCountTextEl) totalCountTextEl.innerHTML = displayText;
        updatePromoMessage();
    }

    calculateTotal();
});

// 口味上下架管理
document.querySelectorAll(".flavor-item input[type='text']").forEach(input => {
    input.addEventListener("input", function () {
        let flavorId = this.id;
        let flavorName = this.parentElement.querySelector("label").textContent;
        let value = this.value.trim();
        if (window.myGlobalDisabledFlavors.includes(flavorId) && value !== "" && value !== "0") {
            alert(`目前尚未開放 ${flavorName} 訂購喔!!`);
            this.value = "";
        }
    });
});

function parseLocalDate(dateStr) {
    const [year, month, day] = dateStr.split("-");
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

document.getElementById("showInvoiceInfo")?.addEventListener("change", function () {
    const invoiceSection = document.getElementById("invoiceSection");
    if (invoiceSection) {
        invoiceSection.style.display = this.checked ? "flex" : "none";
    }
    if (!this.checked) {
        const title = document.getElementById("invoiceTitle");
        const num = document.getElementById("invoiceNumber");
        if (title) title.value = "";
        if (num) num.value = "";
    }
});

function updatePromoMessage() {
    const bar = document.getElementById("promoMsg");
    if (!bar) return;

    const paid = Number(window.calculatedCount) || 0;
    const valid = window.promoValid !== false;

    if (paid === 0) {
        bar.classList.remove("show");
        bar.style.display = "none";
        document.body.classList.remove("promo-fixed-padding");
        document.body.style.removeProperty('--promoH');
        return;
    }

    bar.style.display = "";
    bar.classList.add("show");

    if (!valid) {
        bar.textContent = "請幫我填寫「贈送 1 枝」的口味喔 😊";
    } else {
        const r = paid % 10;
        bar.textContent =
            r === 0 ? "🎉 太棒了，這是完美的買十送一組合🍡💛" :
            r === 9 ? "再 1 枝就送 1 枝 ✨" :
                `再 ${10 - r} 枝就送 1 枝 🎁`;
    }

    requestAnimationFrame(() => {
        const h = bar.offsetHeight || 48;
        document.body.style.setProperty('--promoH', h + 'px');
        document.body.classList.add('promo-fixed-padding');
    });
}

window.addEventListener('resize', () => {
    const bar = document.getElementById("promoMsg");
    if (!bar || bar.style.display === 'none') return;
    const h = bar.offsetHeight || 48;
    document.body.style.setProperty('--promoH', h + 'px');
});

// 🎯 各取貨地點的可取貨時間範圍
const pickupTimeRules = {
    "樂華店": { start: "16:40", end: "22:00" },
    "士林店": { start: "18:00", end: "22:00" },
    "三重取貨點": { start: "14:00", end: "17:30" },
    "三重取貨點（早上）": { start: "08:00", end: "09:00" }
};

// 將 "HH:mm" 轉成當天的分鐘數，方便比較大小
function timeStrToMinutes(timeStr) {
    if (!timeStr || timeStr.indexOf(":") === -1) return null;
    const parts = timeStr.split(":");
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
}

// 🎯 驗證取貨時間是否落在該地點的允許範圍內
function validatePickupTime(location, timeStr) {
    const rule = pickupTimeRules[location];
    // 沒有對應規則的地點，不限制（直接通過）
    if (!rule) return true;

    const t = timeStrToMinutes(timeStr);
    const startT = timeStrToMinutes(rule.start);
    const endT = timeStrToMinutes(rule.end);
    if (t === null) return false;

    return t >= startT && t <= endT;
}

// 🎯 取貨時間不符時要顯示的提示文字
function getPickupNotification(location) {
    const rule = pickupTimeRules[location];
    if (!rule) return "請確認您輸入的取貨時間是否正確喔！";
    return `${location}的取貨時間為 ${rule.start} ~ ${rule.end}，請重新選擇取貨時間喔！`;
}
