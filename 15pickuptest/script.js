// 🎯 將口味限制移到最頂端，並改名為全球唯一變數，徹底根治「Identifier has already been declared」的快取怨念！
if (typeof window.myGlobalDisabledFlavors === 'undefined') {
    window.myGlobalDisabledFlavors = ["qtyMango"];
}

document.addEventListener("DOMContentLoaded", function () {
    // 🎯 強制關閉瀏覽器內建的「請填寫這欄」氣泡提示，全面啟用我們的自訂紅框功能！
    const orderForm = document.getElementById("orderForm");
    if (orderForm) {
        orderForm.setAttribute("novalidate", "true");
    }

    // Reset form on page load
    if (orderForm) orderForm.reset();
    
    // 初始化按鈕文字為「前往確認」
    const initialSubmitBtn = document.querySelector("input[type='submit']");
    if (initialSubmitBtn) initialSubmitBtn.value = "前往確認";

    // Clear pickup location radio clicked markers
    document.querySelectorAll("input[name='pickupLocation']").forEach(radio => {
        radio.dataset.clicked = "false";
    });
    // Clear total amount display
    document.getElementById("totalCountText").innerHTML = "";

    // 🌐 宣告日期配置變數（先給它你原本的設定當作預設備用）
    let locationConfig = {
        lehua: {
            blacklist: {
                dates: ["2026-05-09", "2026-04-18", "2026-04-25"],
                ranges: []
            }
        },
        shilin: {
            blacklist: {
                dates: ["2026-03-31", "2026-05-09"],
                ranges: []
            }
        },
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
        sanchongMorning: {
            whitelist: [
                "2026-03-28",
                "2026-04-25",
                "2026-05-09"
            ]
        }
    };

    // 🚀 從線上檔案讀取最新日期限定，並自動覆蓋上面黑白名單
    async function fetchOnlineLocationConfig() {
        const baseUrl = "https://script.google.com/macros/s/AKfycbuvO5OjaPocqyCdR2gNPbO_yV0jcOp7QK1aEODgNvBKEOQa-bgmiVwpmoM2K0D0l2N/exec";
        const configUrl = `${baseUrl}?_=${new Date().getTime()}`;
        
        try {
            const response = await fetch(configUrl);
            if (response.ok) {
                // 🎯 配合 GAS 改回標準 JSON 解析法
                const onlineConfig = await response.json();
                
                locationConfig = onlineConfig; // 成功讀取，覆蓋本地設定
                console.log("成功動態載入最新的線上日期限定配置！", locationConfig);
                
                // 如果此時使用者已經選了日期，立刻刷新地點限制顯示
                const currentEventDate = document.getElementById("eventDate").value;
                if (currentEventDate) {
                    updateAvailableLocations(currentEventDate);
                }
            }
        } catch (error) {
            console.warn("線上日期設定檔讀取失敗，將自動以程式內預設的備用配置運行。", error);
        }
    }

    // 啟動時立刻執行線上抓取設定
    fetchOnlineLocationConfig();

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
            updateAvailableLocations(dateStr);
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

    // Restrict event date and pickup date input range
    let eventDateInput = document.getElementById("eventDate");
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
            if (!isNaN(minPickupDate.getTime())) {
                let y = minPickupDate.getFullYear();
                let m = String(minPickupDate.getMonth() + 1).padStart(2, '0');
                let d = String(minPickupDate.getDate()).padStart(2, '0');
                
                pickupDateInput.setAttribute("min", `${y}-${m}-${d}`);
                pickupDateInput.setAttribute("max", this.value);
            }
            updateAvailableLocations(this.value);
        }, 1500);
    });

    let pickupDateInput = document.getElementById("pickupDate");
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
            updateAvailableLocations(eventDateInput.value);
            let pickupTimeFlatpickr = document.querySelector("#pickupTime")._flatpickr;
            if (pickupTimeFlatpickr) {
                pickupTimeFlatpickr.setDate(pickupTimeFlatpickr.input.value, true);
            }
        }, 500);
    });

    let pickupTimeFlatpickr = document.querySelector("#pickupTime")._flatpickr;
    if (pickupTimeFlatpickr) {
        pickupTimeFlatpickr.setDate(pickupTimeFlatpickr.input.value, true);
    }

    // Restrict phone number to digits only
    let phoneNumberInput = document.getElementById("phoneNumber");
    phoneNumberInput.addEventListener("input", function () {
        this.value = this.value.replace(/\D/g, "");
    });

    // Allow pickup location to be deselected
    document.querySelectorAll(".pickup-option input[type='radio']").forEach(radio => {
        radio.addEventListener("click", function () {
            document.querySelectorAll("input[name='pickupLocation']").forEach(r => {
                r.dataset.clicked = "false";
            });
            this.dataset.clicked = "true";
            const pickupTimeInput = document.getElementById("pickupTime");
            const selectedTime = pickupTimeInput.value;
            if (selectedTime) {
                const isValid = validatePickupTime(this.value, selectedTime, true);
                if (!isValid) {
                    alert(getPickupNotification(this.value));
                    pickupTimeInput.value = "";
                }
                pickupTimeInput.dataset.valid = isValid ? "true" : "false";
            }
        });
    });

    function validatePickupTime(location, time, checkOnly = false, inputElement = null) {
        let isValid = true;
        if (location === "樂華店" && (time < "16:40" || time > "22:00")) {
            isValid = false;
        } else if (location === "士林店" && (time < "18:00" || time > "22:00")) {
            isValid = false;
        } else if (location === "三重取貨點" && (time < "14:00" || time > "17:30")) {
            isValid = false;
        } else if (location === "三重取貨點（早上）") {
            if (time < "08:00" || time > "09:00") isValid = false;
        }
        if (!isValid && !checkOnly) {
            alert(getPickupNotification(location));
            if (inputElement) inputElement.value = "";
        }
        return isValid;
    }

    function getPickupNotification(location) {
        if (location === "樂華店") {
            return "樂華店取貨時間為 16:40 - 22:00喔！";
        } else if (location === "士林店") {
            return "士林店取貨時間為 18:00 - 22:00喔！";
        } else if (location === "三重取貨點") {
            return "三重取貨點取貨時間為 14:00 - 17:30喔！";
        } else if (location === "三重取貨點（早上）") {
            return "三重取貨點（早上）取貨時間為 08:00 - 09:00喔！";
        }
        return "請選擇正確的取貨地點。";
    }

    function updateAvailableLocations(selectedDateStr) {
        const selectedDate = new Date(selectedDateStr);
        const locations = {
            lehua: document.getElementById("optionLehua"),
            shilin: document.getElementById("optionShilin"),
            sanchong: document.getElementById("optionSanchong"),
            sanchongMorning: document.getElementById("optionSanchongMorning")
        };
        Object.keys(locations).forEach(key => {
            const el = locations[key];
            if (key === "sanchongMorning") {
                const pickupDateStr = document.getElementById("pickupDate").value;
                const eventDateStr = document.getElementById("eventDate").value;
                const whiteList = locationConfig.sanchongMorning.whitelist;
                let shouldShow = false;
                if (
                    pickupDateStr &&
                    eventDateStr &&
                    pickupDateStr === eventDateStr &&
                    whiteList.includes(pickupDateStr)
                ) {
                    shouldShow = true;
                }
                el.style.display = shouldShow ? "flex" : "none";
                return;
            }
            const { blacklist } = locationConfig[key];
            let shouldHide = false;
            if (blacklist.dates.includes(selectedDateStr)) {
                shouldHide = true;
            }
            if (!shouldHide && blacklist.ranges.length > 0) {
                for (let range of blacklist.ranges) {
                    const start = new Date(range.start);
                    const end = new Date(range.end);
                    if (selectedDate >= start && selectedDate <= end) {
                        shouldHide = true;
                        break;
                    }
                }
            }
            el.style.display = shouldHide ? "none" : "flex";
        });
    }

    let pickupTimeInput = document.getElementById("pickupTime");
    pickupTimeInput.setAttribute("step", "60");
    pickupTimeInput.addEventListener("blur", function () {
        const selectedTime = this.value;
        const selectedLocation = document.querySelector(".pickup-option input[type='radio']:checked");
        if (!selectedLocation) return;
        const isValid = validatePickupTime(selectedLocation.value, selectedTime, false, this);
        this.dataset.valid = isValid ? "true" : "false";
    });

    // Restrict invoice number to digits only
    document.getElementById("invoiceNumber").addEventListener("input", function () {
        this.value = this.value.replace(/\D/g, "");
    });

    // 限制口味輸入框只能輸入數字
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

    // 取得訂購清單 (全品項改為 15 元)
    function getOrderDetails() {
        const flavorData = [
            { name: "多多", id: "qtyDuoDuo" },
            { name: "葡萄", id: "qtyGrape" },
            { name: "荔枝", id: "qtyLychee" },
            { name: "百香果", id: "qtyPassionFruit" },
            { name: "草莓", id: "qtyStrawberry" },
            { name: "蘋果", id: "qtyApple" },
            { name: "鳳梨", id: "qtyPineapple" },
            { name: "柳橙", id: "qtyOrange" },
            { name: "水蜜桃", id: "qtyPeach" },
            { name: "芒果", id: "qtyMango" }
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
    
    // 表單提交處理邏輯
    document.getElementById("orderForm").addEventListener("submit", async function (event) {
        event.preventDefault();
        
        // 1. 需要紅框提示的必填欄位
        let requiredFields = [
            { id: "customerName" },
            { id: "phoneNumber" },
            { id: "orderSchool" }, 
            { id: "orderClass" },  
            { id: "eventDate" },
            { id: "pickupDate" },
            { id: "pickupTime" }
        ];
        let hasError = false;

        // 2. 檢查輸入框（只上紅框）
        requiredFields.forEach(field => {
            let input = document.getElementById(field.id);
            if (!input || !input.value.trim()) {
                hasError = true;
                if (input) input.style.border = "2px solid red";
            } else {
                if (input) input.style.border = "";
            }
        });

        // 3. 特殊檢查：取貨地點
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

        // 有漏填直接平滑捲動回最頂端並中斷
        if (hasError) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        pickupLocationElement.dataset.clicked = "true";

        // Get form values
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

        // 再次驗證時間合法性
        const pickupTimeInput = document.getElementById("pickupTime");
        if (!validatePickupTime(pickupLocation, pickupTime, true)) {
             alert("請確認您輸入的取貨時間是否正確喔！");
             pickupTimeInput.style.border = "2px solid red";
             pickupTimeInput.focus();
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

        // 防止提交空訂單
        if (totalCount === 0) {
            alert(`請填寫欲訂購的口味及數量喔😊`);
            return;
        }

        // 買十送一總數核對
        if ((calculatedCount + bonusCount) !== totalCount) {
            const diff = (calculatedCount + bonusCount) - totalCount;
            alert(`若要購買 ${calculatedCount} 枝，贈送 ${bonusCount} 枝。請再挑選 ${diff} 枝。`);
            return;
        }

        // 🔒【總枝數上限 164 枝限制】
        if (totalCount > 164) {
            alert(`總枝數 ${totalCount} 枝超過上限 164 枝，請減少 ${totalCount - 164} 枝喔😊`);
            return;
        }

        // 買十送一促銷加碼引導彈窗
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
        
        // 產能限制後端核對
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
                    orderType: "packing" 
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

        // Confirmation layout
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
        confirmationMessage += `🔢 總枝數：${totalCount} 枝，共 ${adjustedPrice} 元。\n\n`;
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
        buttonContainer.style = "display: flex; justify-content: space-between; margin-top: 20px;";
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
            formData.append("entry.153434121", customerName);
            formData.append("entry.1286553898", phoneNumber);
            formData.append("entry.29286919", orderUnit);
            formData.append("entry.1406293128", invoiceTitle);
            formData.append("entry.307667347", invoiceNumber);
            formData.append("entry.2132577574", eventDate);
            formData.append("entry.969880587", pickupLocation);
            formData.append("entry.355577760", pickupDate);
            formData.append("entry.1822166015", pickupTime);
            formData.append("entry.316562737", document.getElementById("qtyDuoDuo").value || "0");
            formData.append("entry.2045995529", document.getElementById("qtyGrape").value || "0");
            formData.append("entry.632518397", document.getElementById("qtyLychee").value || "0");
            formData.append("entry.1388020976", document.getElementById("qtyPassionFruit").value || "0");
            formData.append("entry.1942859558", document.getElementById("qtyStrawberry").value || "0");
            formData.append("entry.761436590", document.getElementById("qtyApple").value || "0");
            formData.append("entry.454770086", document.getElementById("qtyPineapple").value || "0");
            formData.append("entry.1676199734", document.getElementById("qtyOrange").value || "0");
            formData.append("entry.1154026181", document.getElementById("qtyPeach").value || "0");
            formData.append("entry.236488691", document.getElementById("qtyMango").value || "0");

            fetch("https://docs.google.com/forms/u/0/d/e/1FAIpQLSe6tzVbIUYkpADid6OwhxLitHyK4GgzQJMRHvLdwnNZA60mZg/formResponse", {
                method: "POST", mode: "no-cors", body: formData
            });

            const currentHour = new Date().getHours();
            const isServiceTime = currentHour >= 10 && currentHour < 22; 
            const isHighAmount = adjustedPrice >= 1000;

            let alertMessage = "";
            if (isServiceTime) {
                if (!isHighAmount) {
                    alertMessage = `非常感謝您的填寫，再麻煩您點選下方按鈕通知負責人員您已完成填單，服務人員將於30-50分鐘內與您確認訂單細節，尚未確認前皆未完成訂購程序喔^^\n\n※請注意在與服務人員確認訂單前，此筆訂單尚未成立。`;
                } else {
                    alertMessage = `非常感謝您的填寫，再麻煩您點選下方按鈕通知負責人員您已完成填單，服務人員將於30-50分鐘內與您確認訂單細節與付訂，尚未付訂前皆未完成訂購程序喔^^\n\n※請注意在與服務人員確認訂單與付訂前，此筆訂單尚未成立。`;
                }
            } else {
                if (!isHighAmount) {
                    alertMessage = `非常感謝您的填寫，再麻煩您點選下方按鈕通知負責人員您已完成填單。服務人員將於服務時間內(10:00-22:00)與您確認訂單細節，尚未確認前皆未完成訂購程序喔^^\n\n※請注意在與服務人員確認訂單前，此筆訂單尚未成立。`;
                } else {
                    alertMessage = `非常感謝您的填寫，再麻煩您點選下方按鈕通知負責人員您已完成填單。服務人員將於服務時間內(10:00-22:00)與您確認訂單細節與付訂，尚未付訂前皆未完成訂購程序喔^^\n\n※請注意在與服務人員確認訂單與付訂前，此筆訂單尚未成立。`;
                }
            }

            let successOverlay = document.createElement("div");
            successOverlay.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1999;";
            let successBox = document.createElement("div");
            successBox.style = `
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                background: #fff; padding: 25px; border-radius: 12px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.2); width: 85%; max-width: 400px;
                z-index: 2000; text-align: center;
            `;
            let successText = document.createElement("p");
            successText.style = "font-size: 16px; white-space: pre-line; text-align: left; line-height: 1.6; color: #333;";
            successText.textContent = alertMessage;

            let goLineBtn = document.createElement("button");
            goLineBtn.textContent = "前往告知"; 
            goLineBtn.style = "margin-top: 20px; background: #ff6600; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: bold; width: 100%; box-sizing: border-box;";

            goLineBtn.onclick = () => {
                document.body.removeChild(successBox);
                document.body.removeChild(successOverlay);
                
                document.getElementById("orderForm").reset();
                document.querySelectorAll("input[name='pickupLocation']").forEach(radio => {
                    radio.dataset.clicked = "false";
                });
                window.calculatedCount = 0;
                window.promoValid = true;
                updatePromoMessage();
                calculateTotal();

                const urlParams = new URLSearchParams(window.location.search);
                const source = urlParams.get('v'); 
                const lineLinks = {
                    "lH4m8Q5v": "https://lin.ee/ts3AVmE", 
                    "sL9x7P2k": "https://lin.ee/ne8VszX", 
                    "mL3w6R9j": "https://lin.ee/yuKF8z7"  
                };
                if (source && lineLinks[source]) {
                    window.location.href = lineLinks[source];
                } else {
                    window.scrollTo(0, 0); 
                }
            };

            successBox.appendChild(successText);
            successBox.appendChild(goLineBtn);
            document.body.appendChild(successOverlay);
            document.body.appendChild(successBox);
        };

        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(finalSubmitButton);
        confirmBox.appendChild(messageText);
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
            let qty = parseInt(document.getElementById(id).value) || 0;
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
            document.getElementById("totalCountText").innerHTML = displayText;
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
        document.getElementById("totalCountText").innerHTML = displayText;
        updatePromoMessage();
    }
    
    calculateTotal(); 
});

// 口味上下架管理對照
var disabledFlavors = ["qtyMango"];
document.querySelectorAll(".flavor-item input[type='text']").forEach(input => {
    input.addEventListener("input", function () {
        let flavorId = this.id;
        let flavorName = this.parentElement.querySelector("label").textContent;
        let value = this.value.trim();
        if (disabledFlavors.includes(flavorId) && value !== "" && value !== "0") {
            alert(`目前尚未開放 ${flavorName} 訂購喔!!`);
            this.value = "";
        }
    });
});

["optionLehua", "optionShilin", "optionSanchong", "optionSanchongMorning"].forEach(id => {
    document.getElementById(id).style.display = "none";
});

function parseLocalDate(dateStr) {
    const [year, month, day] = dateStr.split("-");
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

document.getElementById("showInvoiceInfo").addEventListener("change", function () {
    const invoiceSection = document.getElementById("invoiceSection");
    invoiceSection.style.display = this.checked ? "flex" : "none";
    if (!this.checked) {
        document.getElementById("invoiceTitle").value = "";
        document.getElementById("invoiceNumber").value = "";
    }
});

function updatePromoMessage() {
  const bar = document.getElementById("promoMsg");
  if (!bar) return;

  const paid  = Number(window.calculatedCount) || 0;
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
