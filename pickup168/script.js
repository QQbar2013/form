document.addEventListener("DOMContentLoaded", function () {
    // Reset form on page load
    document.getElementById("orderForm").reset();
    // Clear pickup location radio clicked markers
    document.querySelectorAll("input[name='pickupLocation']").forEach(radio => {
        radio.dataset.clicked = "false";
    });
    // Clear total amount display
    document.getElementById("totalCountText").innerHTML = "";
    // Initialize flatpickr for event date, pickup date, and pickup time
    const eventDatePicker = flatpickr("#eventDate", {
        dateFormat: "Y-m-d",
        minDate: "today",
        maxDate: new Date().fp_incr(180),
        onChange: function (selectedDates, dateStr, instance) {
            if (!dateStr) return;
            const eventDate = new Date(dateStr);
            const minPickupDate = new Date(eventDate);
            minPickupDate.setDate(eventDate.getDate() - 30);
            pickupDatePicker.set("minDate", minPickupDate);
            pickupDatePicker.set("maxDate", dateStr);
            updateAvailableLocations(dateStr);
        }
    });
    const pickupDatePicker = flatpickr("#pickupDate", {
        dateFormat: "Y-m-d"
    });
    flatpickr("#pickupTime", {
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
    const locationConfig = {
        lehua: {
            blacklist: {
                dates: [],
                ranges: []
            }
        },
        shilin: {
            blacklist: {
                dates: ["2025-05-03"],
                ranges: []
            }
        },
        sanchong: {
            blacklist: {
                dates: [],
                ranges: [
                    { start: "2025-10-08", end: "2025-10-30" },
                    { start: "2025-11-01", end: "2025-11-06" },
                    { start: "2025-11-08", end: "2099-05-24" }
                ]
            }
        },
        sanchongMorning: {
            whitelist: [
                "2025-10-31",
                "2025-11-08"
            ]
        }
    };
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
            minPickupDate.setDate(eventDate.getDate() - 30);
            let pickupDateInput = document.getElementById("pickupDate");
            if (!isNaN(minPickupDate.getTime())) {
                pickupDateInput.setAttribute("min", minPickupDate.toISOString().split("T")[0]);
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
            minPickupDate.setDate(eventDate.getDate() - 30);
            if (selectedDate < minPickupDate || selectedDate > eventDate) {
                alert("請選擇活動日期前 30 天到活動當天的日期");
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
        } else if (location === "三重取貨點（早上）" && (time < "08:00" || time > "09:00")) {
            isValid = false;
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
    // 允許任意非負整數（移除 6 倍數限制）
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
    document.getElementById("orderForm").addEventListener("submit", function (event) {
        event.preventDefault();
        // Validate required fields
        let requiredFields = [
            { id: "customerName", label: "訂購人姓名" },
            { id: "phoneNumber", label: "聯絡電話" },
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
        pickupLocationElement.dataset.clicked = "true";

        // Get form values
        const customerName = document.getElementById("customerName").value.trim();
        const phoneNumber = document.getElementById("phoneNumber").value.trim();
        const orderUnit = document.getElementById("orderUnit").value.trim();
        const eventDate = document.getElementById("eventDate").value.trim();
        const invoiceTitle = document.getElementById("invoiceTitle").value.trim();
        const invoiceNumber = document.getElementById("invoiceNumber").value.trim();
        const pickupLocation = pickupLocationElement.value;
        const pickupDate = document.getElementById("pickupDate").value.trim();
        const pickupTime = document.getElementById("pickupTime").value.trim();
        // Validate pickup time
        const pickupTimeInput = document.getElementById("pickupTime");
        const isValidTime = validatePickupTime(pickupLocation, pickupTime, false, pickupTimeInput);
        pickupTimeInput.dataset.valid = isValidTime ? "true" : "false";
        if (pickupTimeInput.dataset.valid !== "true") {
            alert("請確認您輸入的取貨時間是否正確喔！");
            pickupTimeInput.focus();
            return;
        }
        // Validate pickup date range
        const pickupDateObj = parseLocalDate(pickupDate);
        const eventDateObj = parseLocalDate(eventDate);
        const minPickupDate = new Date(eventDateObj);
        minPickupDate.setDate(eventDateObj.getDate() - 30);
        if (pickupDateObj < minPickupDate || pickupDateObj > eventDateObj) {
            alert("請選擇活動日期前 30 天到活動當天的日期");
            return;
        }
        // Get order details
        const { orderDetails, totalCount, totalPrice, fifteenYuanTotal } = getOrderDetails();
        const calculatedCount = Math.ceil(totalCount / 1.1);
        const bonusCount = Math.floor(calculatedCount / 10);
        const adjustedPrice = totalPrice - bonusCount * 12;
        // Validate total count (must be at least 165)
        if (totalCount < 165) {
            alert(`總枝數 ${totalCount} 枝未達最低要求 165 枝喔😊。`);
            return;
        }
        // Validate buy-10-get-1-free
        if ((calculatedCount + bonusCount) !== totalCount) {
            const diff = (calculatedCount + bonusCount) - totalCount;
            alert(` ${totalCount} 枝無法拆解成『訂購 + 贈送』的買十送一組合，請調整或增加枝數喔😊`);
            return;
        }
        // Create confirmation message
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
        if (fifteenYuanTotal > 0) {
            confirmationMessage += ` ⤷ 贈送口味為 12 元口味。\n`;
        }
        // Display confirmation dialog
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
        let submitButton = document.createElement("button");
        submitButton.textContent = "送出";
        submitButton.style = "background: #ff6600; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;";
        submitButton.onclick = () => {
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
            console.log("🚀 送出前的 formData 項目：");
            for (let [key, value] of formData.entries()) {
                console.log(`${key}: ${value}`);
            }
            fetch("https://docs.google.com/forms/u/0/d/e/1FAIpQLSe6tzVbIUYkpADid6OwhxLitHyK4GgzQJMRHvLdwnNZA60mZg/formResponse", {
                method: "POST",
                mode: "no-cors",
                body: formData
            });
            document.getElementById("orderForm").reset();
            document.querySelectorAll("input[name='pickupLocation']").forEach(radio => {
                radio.dataset.clicked = "false";
            });
            calculateTotal();
            alert(`非常感謝您的填寫，再麻煩您通知負責人員您已完成填單，以確認您的訂單與付訂，尚未付訂前皆未完成訂購程序喔^^
若已超過服務時間(10:00-22:00)，則翌日處理，謝謝您^^
※請注意再與服務人員確認且付訂前，此筆訂單尚未成立。`);
        };
        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(submitButton);
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
        let isValid = (calculatedCount + bonusCount) === totalCount;
        let hasInput = totalCount > 0;
        let totalPrice = twelveYuanTotal * 12 + fifteenYuanTotal * 15 - bonusCount * 12;
        let displayText = `<div class="total-summary">`;
        if (totalCount > 0) {
            displayText += `<div class="total-row">總枝數: ${totalCount} 枝。</div>`;
            displayText += `<br>`;
        }
        if (!isValid) {
            let suggestedBuy = calculatedCount;
            let suggestedBonus = Math.floor(suggestedBuy / 10);
            let difference = (suggestedBuy + suggestedBonus) - totalCount;
            displayText += `<div class="total-row error-text">
                ${totalCount} 枝無法拆解成『訂購 + 贈送』的買十送一組合，請調整或增加枝數喔😊
            </div>`;
            document.getElementById("totalCountText").innerHTML = displayText;
            return;
        }
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
    }
    // Disabled flavors handling
    const disabledFlavors = ["qtyMango"];
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
    // Control invoice section display
    document.getElementById("showInvoiceInfo").addEventListener("change", function () {
        const invoiceSection = document.getElementById("invoiceSection");
        invoiceSection.style.display = this.checked ? "flex" : "none";
        if (!this.checked) {
            document.getElementById("invoiceTitle").value = "";
            document.getElementById("invoiceNumber").value = "";
        }
    });
});
