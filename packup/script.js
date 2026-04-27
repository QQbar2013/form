document.addEventListener("DOMContentLoaded", function () {
    // ✅ 每次載入頁面就清空表單
    document.getElementById("orderForm").reset();

    // ✅ 新增：初始化按鈕文字為「前往確認」
    const initialSubmitBtn = document.querySelector("input[type='submit']");
    if (initialSubmitBtn) initialSubmitBtn.value = "前往確認";

    // 清空取貨地點 radio 的 clicked 標記
    document.querySelectorAll("input[name='pickupLocation']").forEach(radio => {
        radio.dataset.clicked = "false";
    });

    // 清空總金額顯示
    document.getElementById("totalCountText").innerHTML = "";

    // 限制活動日期選擇範圍 (今天 ~ 180 天內)
    let today = new Date();
    today.setHours(0, 0, 0, 0);
    let maxDate = new Date();
    maxDate.setDate(today.getDate() + 180);
    // ✅ 初始化 flatpickr：活動日、取貨日、取貨時間
    // Initialize flatpickr for event date, pickup date, and pickup time
    const eventDatePicker = flatpickr("#eventDate", {
        disableMobile: "true", // 👈 新增：強制手機使用統一的日曆介面，避開原生 Bug
        dateFormat: "Y-m-d",
        minDate: "today",
        maxDate: new Date().fp_incr(180),
        onChange: function (selectedDates, dateStr, instance) {
            if (!dateStr || selectedDates.length === 0) return;
            
            // 直接抓取 selectedDates[0] 避免字串轉換的時區問題
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
        disableMobile: "true", // 👈 新增：強制手機使用統一的日曆介面
        dateFormat: "Y-m-d"
    });

    flatpickr("#pickupTime", {
        disableMobile: "true", // 👈 新增：強制手機使用統一的時間介面
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
    //    eventDateInput.setAttribute("min", today.toISOString().split("T")[0]);
    //    eventDateInput.setAttribute("max", maxDate.toISOString().split("T")[0]);

    // --- 這裡開始貼上新程式碼 (取代原本 88-121) ---
    let locationConfig = {
        lehua: { blacklist: { dates: [], ranges: [] } },
        shilin: { blacklist: { dates: [], ranges: [] } },
        sanchong: { blacklist: { dates: [], ranges: [] } },
        sanchongMorning: { whitelist: [] }
    };

    async function loadConfigFromSheets() {
        const sheetCsvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSktBQEhEilW6wi43a5YluhMnCWMLU9swMC3By4eKNGkKWuTwvoNtEgfuAkEdxCK8ceD8Vr3ef_NLoA/pub?gid=0&single=true&output=csv&t=" + Date.now();

        try {
            const response = await fetch(sheetCsvUrl);
            const data = await response.text();
            const rows = data.split("\n").slice(1); 

            const tempConfig = {
                lehua: { blacklist: { dates: [], ranges: [] } },
                shilin: { blacklist: { dates: [], ranges: [] } },
                sanchong: { blacklist: { dates: [], ranges: [] } },
                sanchongMorning: { whitelist: [] }
            };

            rows.forEach(row => {
                const cols = row.split(",").map(c => c.trim().replace(/"/g, ''));
                if (cols.length < 3) return;
                const [id, type, start, end] = cols;
                if (tempConfig[id]) {
                    if (type === "date") {
                        tempConfig[id].blacklist.dates.push(start);
                    } else if (type === "range" && end) {
                        tempConfig[id].blacklist.ranges.push({ start: start, end: end });
                    } else if (type === "white") {
                        tempConfig[id].whitelist.push(start);
                    }
                }
            });

            locationConfig = tempConfig;
            console.log("✅ 雲端設定已同步:", locationConfig);

            const currentEventDate = document.getElementById("eventDate").value;
            if (currentEventDate) updateAvailableLocations(currentEventDate);
        } catch (err) {
            console.error("❌ 雲端抓取失敗:", err);
        }
    }

    loadConfigFromSheets();
    // --- 新程式碼結束 ---



    // 限制活動日期 & 取貨日期輸入範圍
    eventDateInput.addEventListener("change", function () {
        setTimeout(() => {
            if (!this.value) return;
            let eventDate = parseLocalDate(this.value); // ✅ 改用 parseLocalDate
            eventDate.setHours(0, 0, 0, 0);
            if (eventDate < today || eventDate > maxDate) {
                alert("請選擇今天到 180 天內的日期");
                this.value = "";
                return;
            }
            let minPickupDate = new Date(eventDate);
            minPickupDate.setDate(eventDate.getDate() - 1);
            let pickupDateInput = document.getElementById("pickupDate");
            if (!isNaN(minPickupDate.getTime())) {
                // 👈 修正：避免使用 toISOString() 產生時差，改為抓取本地時間
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

            // 🔸 原有的驗證
            let selectedDate = parseLocalDate(this.value);
            selectedDate.setHours(0, 0, 0, 0);
            let eventDate = new Date(eventDateInput.value);
            eventDate.setHours(0, 0, 0, 0);
            let minPickupDate = new Date(eventDate);
            minPickupDate.setDate(eventDate.getDate() - 1);
            if (selectedDate < minPickupDate || selectedDate > eventDate) {
                alert("請選擇活動日期前一日到活動當天的日期");
                this.value = "";
            }

            // ✅ 更新取貨地點（處理早上場）
            updateAvailableLocations(eventDateInput.value);


            // ✅ 強制刷新取貨時間 flatpickr 的限制
            let pickupTimeFlatpickr = document.querySelector("#pickupTime")._flatpickr;
            if (pickupTimeFlatpickr) {
                pickupTimeFlatpickr.setDate(pickupTimeFlatpickr.input.value, true); // 再套用一次 onOpen 裡的時間限制
            }
        }, 500);
    });
    // ✅ 強制刷新取貨時間 flatpickr 的限制
    let pickupTimeFlatpickr = document.querySelector("#pickupTime")._flatpickr;
    if (pickupTimeFlatpickr) {
        pickupTimeFlatpickr.setDate(pickupTimeFlatpickr.input.value, true);
    }


    // **限制聯絡電話只能輸入數字**
    let phoneNumberInput = document.getElementById("phoneNumber");
    phoneNumberInput.addEventListener("input", function () {
        this.value = this.value.replace(/\D/g, ""); // 移除非數字字符
    });

    // **取貨地點可取消選取**
    // 監聽取貨地點變更
    document.querySelectorAll(".pickup-option input[type='radio']").forEach(radio => {
        radio.addEventListener("click", function () {
            // 直接清除 clicked 標記，只記錄目前選的
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

    // **取貨時間檢查函數**
    function validatePickupTime(location, time, checkOnly = false, inputElement = null) {
        let isValid = true;

        if (location === "樂華店" && (time < "16:40" || time > "22:00")) {
            isValid = false;
        } else if (location === "士林店" && (time < "18:00" || time > "22:00")) {
            isValid = false;
        } else if (location === "三重取貨點" && (time < "14:00" || time > "17:30")) {
            isValid = false;
        } else if (location === "三重取貨點（早上）" && (time < "08:00" || time > "09:00")) {
            isValid = false;
        }

        if (!isValid && !checkOnly) {
            alert(getPickupNotification(location));
            if (inputElement) inputElement.value = ""; // ✅ 清空指定的輸入框
        }

        return isValid;
    }



    // **根據取貨地點顯示不同的通知**
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


    // 🔸第 130 行左右
    function updateAvailableLocations(selectedDateStr) {
        // ✅ 關鍵保險：如果資料還沒抓到，先不執行，避免報錯
        if (!locationConfig || !locationConfig.lehua) return;

        const selectedDate = new Date(selectedDateStr);

        const locations = {
            lehua: document.getElementById("optionLehua"),
            shilin: document.getElementById("optionShilin"),
            sanchong: document.getElementById("optionSanchong"),
            sanchongMorning: document.getElementById("optionSanchongMorning")
        };

        Object.keys(locations).forEach(key => {
            const el = locations[key];
            if (!el) return;

            // ✅ 特殊處理三重早上：只在白名單內顯示
            if (key === "sanchongMorning") {
                const pickupDateStr = document.getElementById("pickupDate").value;
                const eventDateStr = document.getElementById("eventDate").value;
                const whiteList = locationConfig.sanchongMorning.whitelist || [];

                let shouldShow = false;
                if (pickupDateStr && eventDateStr && pickupDateStr === eventDateStr && whiteList.includes(pickupDateStr)) {
                    shouldShow = true;
                }
                el.style.display = shouldShow ? "flex" : "none";
                return;
            }

            // ✅ 一般地點：判斷雲端抓到的黑名單 (Dates & Ranges)
            const config = locationConfig[key];
            if (!config || !config.blacklist) return;

            let shouldHide = false;

            // 1. 檢查單一日期
            if (config.blacklist.dates.includes(selectedDateStr)) {
                shouldHide = true;
            }

            // 2. 檢查日期範圍
            if (!shouldHide && config.blacklist.ranges.length > 0) {
                for (let range of config.blacklist.ranges) {
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




    // **取貨時間限制**
    let pickupTimeInput = document.getElementById("pickupTime");
    pickupTimeInput.setAttribute("step", "60");

    pickupTimeInput.addEventListener("blur", function () {
        const selectedTime = this.value;
        const selectedLocation = document.querySelector(".pickup-option input[type='radio']:checked");
        if (!selectedLocation) return;

        const isValid = validatePickupTime(selectedLocation.value, selectedTime, false, this);

        // ✅ 新增這一行：標記合法狀態
        this.dataset.valid = isValid ? "true" : "false";
    });




    // 限制統一編號只能輸入數字
    document.getElementById("invoiceNumber").addEventListener("input", function () {
        this.value = this.value.replace(/\D/g, "");
    });

    // 限制所有口味輸入框只能輸入數字
    document.querySelectorAll(".flavor-item input[type='text']").forEach(input => {
        input.addEventListener("input", function () {
            this.value = this.value.replace(/\D/g, "");
            calculateTotal();
        });
    });

    function getOrderDetails() {
        const flavorData = [
            { name: "12元口味 - 多多", id: "qtyDuoDuo" },
            { name: "12元口味 - 葡萄", id: "qtyGrape" },
            { name: "12元口味 - 荔枝", id: "qtyLychee" },
            { name: "12元口味 - 百香果", id: "qtyPassionFruit" },
            { name: "12元口味 - 草莓", id: "qtyStrawberry" },
            { name: "15元口味 - 蘋果", id: "qtyApple" },
            { name: "15元口味 - 鳳梨", id: "qtyPineapple" },
            { name: "15元口味 - 柳橙", id: "qtyOrange" },
            { name: "15元口味 - 水蜜桃", id: "qtyPeach" },
            { name: "15元口味 - 芒果", id: "qtyMango" }
        ];

        let orderDetails = "";
        let totalCount = 0;
        let totalPrice = 0;
        let fifteenYuanTotal = 0;

        flavorData.forEach(flavor => {
            let quantity = parseInt(document.getElementById(flavor.id)?.value) || 0;
            if (quantity > 0) {
                orderDetails += `${flavor.name}：${quantity} 枝\n`;
                totalCount += quantity;
                totalPrice += flavor.name.includes("12元") ? quantity * 12 : quantity * 15;

                if (flavor.name.includes("15元")) {
                    fifteenYuanTotal += quantity;
                }
            }
        });

        return { orderDetails, totalCount, totalPrice, fifteenYuanTotal };
    }


    // ✅ 修改為 async 以便執行非同步產能檢查
    document.getElementById("orderForm").addEventListener("submit", async function (event) {
        event.preventDefault();

        // ✅ 必填欄位驗證（顯示缺漏欄位名稱）
        let requiredFields = [
            { id: "customerName", label: "訂購人姓名" },
            { id: "phoneNumber", label: "聯絡電話" },
            { id: "orderSchool", label: "訂購學校/公司" }, // 新增
            { id: "orderClass", label: "訂購班級/部門" },  // 新增
            { id: "eventDate", label: "活動日期" },
            { id: "pickupDate", label: "取貨日期" },
            { id: "pickupTime", label: "取貨時間" }
        ];

        let missingFields = [];

        requiredFields.forEach(field => {
            let input = document.getElementById(field.id);
            if (!input || !input.value.trim()) {
                missingFields.push(field.label);
                if (input) input.style.border = "2px solid red";
            } else {
                input.style.border = "";
            }
        });

        let pickupLocationElement = document.querySelector("input[name='pickupLocation']:checked");
        if (!pickupLocationElement) {
            missingFields.push("取貨地點");
        }

        if (missingFields.length > 0) {
            alert("請填寫以下欄位：\n\n" + missingFields.join("\n"));
            return;
        }

        // 標記已選地點（避免 radio 被取消）
        pickupLocationElement.dataset.clicked = "true";

        // ✅ 取值
        const customerName = document.getElementById("customerName").value.trim();
        const phoneNumber = document.getElementById("phoneNumber").value.trim();
// 抓取兩個新欄位，並用空格組合
        const orderSchool = document.getElementById("orderSchool").value.trim();
        const orderClass = document.getElementById("orderClass").value.trim();
        const orderUnit = `${orderSchool} ${orderClass}`;
        const eventDate = document.getElementById("eventDate").value.trim();
        const invoiceTitle = document.getElementById("invoiceTitle").value.trim();
        const invoiceNumber = document.getElementById("invoiceNumber").value.trim();
        const pickupLocation = pickupLocationElement.value;
        const pickupDate = document.getElementById("pickupDate").value.trim();
        const pickupTime = document.getElementById("pickupTime").value.trim();

        // ✅ 再次嚴格檢查時間
        const pickupTimeInput = document.getElementById("pickupTime");

        // 再次驗證合法時間（萬一 blur 沒觸發）
        const isValidTime = validatePickupTime(pickupLocation, pickupTime, false, pickupTimeInput);
        pickupTimeInput.dataset.valid = isValidTime ? "true" : "false";

        if (pickupTimeInput.dataset.valid !== "true") {
            alert("請確認您輸入的取貨時間是否正確喔！");
            pickupTimeInput.focus();
            return;
        }


        // ✅【取貨日區間驗證】
        const pickupDateObj = parseLocalDate(pickupDate);
        const eventDateObj = parseLocalDate(eventDate);
        const minPickupDate = new Date(eventDateObj);
        minPickupDate.setDate(eventDateObj.getDate() - 1);
        if (pickupDateObj < minPickupDate || pickupDateObj > eventDateObj) {
            alert("請選擇活動日期前一日到活動當天的日期");
            return;
        }

        // ✅ 訂購內容
        const { orderDetails, totalCount, totalPrice, fifteenYuanTotal } = getOrderDetails();
        const calculatedCount = Math.ceil(totalCount / 1.1);
        const bonusCount = Math.floor(calculatedCount / 10);
        const adjustedPrice = totalPrice - bonusCount * 12;

        // 👇 加上這一段，防止空訂單送出！
        if (totalCount === 0) {
            alert(`請填寫欲訂購的口味及數量喔😊`);
            return;
        }
        // 👆 ----------------------
        // ✅ 買十送一數量驗證
        if ((calculatedCount + bonusCount) !== totalCount) {
            const diff = (calculatedCount + bonusCount) - totalCount;
            alert(`若要購買 ${calculatedCount} 枝，贈送 ${bonusCount} 枝。請再挑選 ${diff} 枝。`);
            return;
        }

        if (totalCount > 164) {
            alert(`總枝數 ${totalCount} 枝超過上限 164 枝，請減少 ${totalCount - 164} 枝。`);
            return;
        }
// === [新增：買十送一優化引導彈窗] ===
        const remainder = calculatedCount % 10;
        if (remainder !== 0) {
            const needed = 10 - remainder;
            // 這裡使用 Promise 封裝彈窗，以便配合 async/await 流程
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
                    resolve(false); // 不留下，繼續執行後續動作
                };
                upsellOverlay.querySelector("#backToOrder").onclick = () => {
                    document.body.removeChild(upsellOverlay);
                    resolve(true); // 留下，中斷提交
                };
            });

            if (stayToBuyMore) return; // 使用者選擇回去多選幾枝，停止後續產能檢查
        }
        // === [優化引導結束] ===
        // 🚀 === [新增：產能總量限制檢查 - 打包版] ===
        const gasUrl = "https://script.google.com/macros/s/AKfycbzE7wP4x3S5k9BOpooS7VkiYMPYdPP2Wx9KDWaOnXZ5GLtWqE1OCHnBnjIy8jQQdWjK/exec";
        const submitBtn = event.submitter || document.querySelector("input[type='submit']");
        
        // 暫時禁用按鈕，防止重複點擊
        submitBtn.disabled = true;
        const originalBtnText = submitBtn.value;
        submitBtn.value = "正在核對產能中...";

        try {
            const checkResponse = await fetch(gasUrl, {
                method: "POST",
                body: JSON.stringify({
                    eventDate: eventDate,
                    totalCount: totalCount,
                    orderType: "packing" // 打包版固定參數
                })
            });
            const checkResult = await checkResponse.json();

            if (checkResult.status === "error") {
                alert(checkResult.message);
                submitBtn.disabled = false;
                submitBtn.value = originalBtnText;
                return; // 產能不足，中斷流程
            }
        } catch (error) {
            alert("系統連線異常，請稍後再試。");
            submitBtn.disabled = false;
            submitBtn.value = originalBtnText;
            return;
        }
        
        // 檢查通過，恢復按鈕狀態
        submitBtn.disabled = false;
        submitBtn.value = originalBtnText;
        // 🚀 === [產能檢查結束] ===

        // ✅ 確認訊息組合
        let confirmationMessage = `請確認您的訂單資訊，若正確無誤請點選右下方"送出"\n\n\n`;
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
        confirmationMessage += `    ⤷ 訂購 ${calculatedCount} 枝 + 贈送 ${bonusCount} 枝。\n`;
        if (fifteenYuanTotal > 0) {
            confirmationMessage += `    ⤷ 贈送口味為 12 元口味。\n`;
        }

        // ✅ 彈出視窗
        let confirmBox = document.createElement("div");
        confirmBox.style = `
            position: fixed;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            background: #fff;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.2);
            width: 90%; max-width: 500px;
            max-height: 80vh; overflow-y: auto;
            z-index: 1000; text-align: left;
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

            // 送出資料
            fetch("https://docs.google.com/forms/u/0/d/e/1FAIpQLSe6tzVbIUYkpADid6OwhxLitHyK4GgzQJMRHvLdwnNZA60mZg/formResponse", {
                method: "POST", mode: "no-cors", body: formData
            });

            // 🚀 [1. 判斷時間與金額，設定專屬訊息]
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

            // 🚀 [2. 建立自訂成功送出視窗]
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

            // 「前往告知」按鈕
            let goLineBtn = document.createElement("button");
            goLineBtn.textContent = "前往告知"; 
            goLineBtn.style = "margin-top: 20px; background: #ff6600; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: bold; width: 100%; box-sizing: border-box;";

            // 🚀 [3. 按鈕點擊後：跳轉 LINE 並清空表單]
            goLineBtn.onclick = () => {
                document.body.removeChild(successBox);
                document.body.removeChild(successOverlay);
                
                // 真正要離開前，再清空表單
                document.getElementById("orderForm").reset();
                document.querySelectorAll("input[name='pickupLocation']").forEach(radio => {
                    radio.dataset.clicked = "false";
                });
                window.calculatedCount = 0;
                window.promoValid = true;
                updatePromoMessage();
                calculateTotal();

                // 抓取網址後綴並跳轉
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

            // 將客製化彈窗顯示出來
            successBox.appendChild(successText);
            successBox.appendChild(goLineBtn);
            document.body.appendChild(successOverlay);
            document.body.appendChild(successBox);
        };

        // 🚨 這是把「第一層確認訂單視窗」放進網頁的邏輯（不要刪掉！）
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
        let twelveYuanTotal = 0;
        let fifteenYuanTotal = 0;

        const twelveYuanIds = ["qtyDuoDuo", "qtyGrape", "qtyLychee", "qtyPassionFruit", "qtyStrawberry"];
        const fifteenYuanIds = ["qtyApple", "qtyPineapple", "qtyOrange", "qtyPeach", "qtyMango"];

        twelveYuanIds.forEach(id => {
            let qty = parseInt(document.getElementById(id).value) || 0;
            twelveYuanTotal += qty;
        });

        fifteenYuanIds.forEach(id => {
            let qty = parseInt(document.getElementById(id).value) || 0;
            fifteenYuanTotal += qty;
        });

        let totalCount = twelveYuanTotal + fifteenYuanTotal;
        let calculatedCount = Math.ceil(totalCount / 1.1);
        let bonusCount = Math.floor(calculatedCount / 10);
        
        // ✅ 讓最上方的提示橫幅能讀取最新數量
        window.calculatedCount = calculatedCount;

        let isValid = (calculatedCount + bonusCount) === totalCount;
        let hasInput = totalCount > 0;
        let totalPrice = twelveYuanTotal * 12 + fifteenYuanTotal * 15 - bonusCount * 12;

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
            
            // ✅ 觸發橫幅更新為「還差 X 枝」
            window.promoValid = false;
            updatePromoMessage();
            return;
        }

        // ✅ 觸發橫幅更新為正確狀態
        window.promoValid = true;

        if (hasInput) {
            displayText += `<div class="total-sub" style="color: red; font-weight: bold; margin: 0;">
            ⤷ 訂購 ${calculatedCount} 枝 + 贈送 ${bonusCount} 枝。
          </div>`;
        }

        if (fifteenYuanTotal > 0) {
            displayText += `<div class="total-sub" style="color: red; font-weight: bold; margin: 0;">
            ⤷ 贈送口味為 12 元口味，若要贈送15元須補3元差價喔。
          </div>`;
        }

        if (totalCount > 0) {
            displayText += `<div class="total-row">總金額: ${totalPrice} 元。</div>`;
        }

        displayText += `</div>`;
        document.getElementById("totalCountText").innerHTML = displayText;

        // ✅ 執行橫幅動畫與更新
        updatePromoMessage();
    }
    calculateTotal(); // 👈 確保這行有留著
}); // 👈 確保這行有留著
// **所有口味的 ID 對照表**
// 12元口味
// - qtyDuoDuo      (多多)
// - qtyGrape       (葡萄)
// - qtyLychee      (荔枝)
// - qtyPassionFruit (百香果)
// - qtyStrawberry  (草莓)

// 15元口味
// - qtyApple       (蘋果)
// - qtyPineapple   (鳳梨)
// - qtyOrange      (柳橙)
// - qtyPeach       (水蜜桃)
// - qtyMango       (芒果)

// **設定未開放的口味 (請在陣列中加入欲關閉的口味 ID)**
const disabledFlavors = ["qtyMango"]; // 例如：不開放「荔枝」與「水蜜桃」

// **監聽所有口味輸入框**
document.querySelectorAll(".flavor-item input[type='text']").forEach(input => {
    input.addEventListener("input", function () {
        let flavorId = this.id; // 取得該輸入框的 ID
        let flavorName = this.parentElement.querySelector("label").textContent; // 取得對應的口味名稱
        let value = this.value.trim(); // 取得輸入框的值

        // **檢查該口味是否為未開放口味**
        if (disabledFlavors.includes(flavorId) && value !== "" && value !== "0") {
            alert(`目前尚未開放 ${flavorName} 訂購喔!!`); // 顯示警告
            this.value = ""; // **清空該輸入框**
        }

    });
});

//隱藏使用none,顯示為flex
//document.getElementById("optionSanchong").style.display = "none";
//document.getElementById("optionLehua").style.display = "flex";
//document.getElementById("optionShilin").style.display = "flex";

["optionLehua", "optionShilin", "optionSanchong", "optionSanchongMorning"].forEach(id => {
    document.getElementById(id).style.display = "none";
});

function parseLocalDate(dateStr) {
    const [year, month, day] = dateStr.split("-");
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)); // 月份從 0 開始
}

// ✅ 控制發票區塊顯示與隱藏
document.getElementById("showInvoiceInfo").addEventListener("change", function () {
    const invoiceSection = document.getElementById("invoiceSection");
    invoiceSection.style.display = this.checked ? "flex" : "none";

    if (!this.checked) {
        // 🔸取消勾選時，清空欄位
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
