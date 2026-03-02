document.addEventListener("DOMContentLoaded", function () {
    console.log("DOM fully loaded, initializing form...");
    
    // [新增設定] 產能核對 API 網址
    const gasUrl = "https://script.google.com/macros/s/AKfycbzE7wP4x3S5k9BOpooS7VkiYMPYdPP2Wx9KDWaOnXZ5GLtWqE1OCHnBnjIy8jQQdWjK/exec";

    // 確認表單元素存在
    const orderForm = document.getElementById("orderForm");
    const totalCountText = document.getElementById("totalCountText");
    const eventDateInput = document.getElementById("eventDate");
    
    if (!orderForm || !totalCountText || !eventDateInput) {
        console.error("Required elements not found:", {
            orderForm: !!orderForm,
            totalCountText: !!totalCountText,
            eventDateInput: !!eventDateInput
        });
        return;
    }
    
    // 清空表單
    orderForm.reset();
    totalCountText.innerHTML = `
        <div class="total-summary">
            <div class="total-row">總枝數: <strong>0</strong> 枝。</div>
        </div>
    `;
    
    // 初始化 flatpickr：到貨日期
    const eventDatePicker = flatpickr("#eventDate", {
        dateFormat: "Y-m-d",
        minDate: "today", // 限制為今天或以後
        maxDate: new Date().fp_incr(180)
    });
    
    // Restrict event date input range
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
        }, 1500);
    });
    
    // 限制聯絡電話只能輸入數字
    const phoneNumberInput = document.getElementById("phoneNumber");
    if (phoneNumberInput) {
        phoneNumberInput.addEventListener("input", function () {
            this.value = this.value.replace(/\D/g, "");
            console.log("Phone number input:", this.value);
        });
    } else {
        console.error("Phone number input not found!");
    }
    
    // 限制統一編號只能輸入數字
    const invoiceNumberInput = document.getElementById("invoiceNumber");
    if (invoiceNumberInput) {
        invoiceNumberInput.addEventListener("input", function () {
            this.value = this.value.replace(/\D/g, "");
            console.log("Invoice number input:", this.value);
        });
    } else {
        console.error("Invoice number input not found!");
    }
    
    // 限制所有口味輸入框只能輸入數字
    const flavorInputs = document.querySelectorAll(".flavor-item input[type='text']");
    if (flavorInputs.length === 0) {
        console.error("No flavor inputs found!");
    } else {
        flavorInputs.forEach(input => {
            input.addEventListener("input", function () {
                this.value = this.value.replace(/\D/g, "");
                console.log(`Flavor input ${this.id}:`, this.value);
                calculateTotal();
            });
        });
    }
    
    // 控制發票區塊顯示與隱藏
    const showInvoiceInfo = document.getElementById("showInvoiceInfo");
    const invoiceSection = document.getElementById("invoiceSection");
    if (showInvoiceInfo && invoiceSection) {
        showInvoiceInfo.addEventListener("change", function () {
            invoiceSection.style.display = this.checked ? "flex" : "none";
            if (!this.checked) {
                document.getElementById("invoiceTitle").value = "";
                document.getElementById("invoiceNumber").value = "";
            }
            console.log("Invoice section display:", invoiceSection.style.display);
        });
    } else {
        console.error("Invoice checkbox or section not found!");
    }
    
    // 計算總計
    function calculateTotal() {
        let totalCount = 0;
        const flavorIds = ["qtyDuoDuo", "qtyGrape", "qtyLychee", "qtyPassionFruit", "qtyStrawberry"];
        flavorIds.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                let qty = parseInt(input.value) || 0;
                totalCount += qty;
            }
        });
        
        let isValid = totalCount % 10 === 0 && totalCount > 0;
        let displayText = `<div class="total-summary">`;
        const boxes = totalCount / 10;
        const boxesText = Number.isInteger(boxes) ? boxes : boxes.toFixed(1);
        displayText += `<div class="total-row">總枝數: <strong>${totalCount}</strong> 枝，共 <strong>${boxesText}</strong> 盒。</div>`;
        
        if (totalCount > 0) {
            let qStickPrice = totalCount * 14;
            let shippingFee = 0;
            if (totalCount >= 10 && totalCount <= 30) {
                shippingFee = 160;
            } else if (totalCount >= 40 && totalCount <= 120) {
                shippingFee = 225;
            } else if (totalCount >= 130 && totalCount <= 240) {
                shippingFee = 290;
            } else if (totalCount >= 250) {
                shippingFee = 0;
            }
            let totalPrice = qStickPrice + shippingFee;
            
            if (isValid) {
                displayText += `<div class="total-sub">⤷ Q棒價格為 <strong>${qStickPrice}</strong> 元。</div>`;
                displayText += `<div class="total-sub">⤷ 運費價格為 <strong>${shippingFee}</strong> 元。</div>`;
                displayText += `<div class="total-row">總金額: <strong>${totalPrice}</strong> 元。</div>`;
            } else {
                displayText += `<div class="total-row error-text">總數量須為10的倍數喔，再麻煩您調整數量喔😊</div>`;
            }
        }
        displayText += `</div>`;
        totalCountText.innerHTML = displayText;
        console.log("Total calculated:", { totalCount, isValid });
    }
    
    // 取得訂購內容
    function getOrderDetails() {
        const flavorData = [
            { name: "多多", id: "qtyDuoDuo" },
            { name: "葡萄", id: "qtyGrape" },
            { name: "荔枝", id: "qtyLychee" },
            { name: "百香", id: "qtyPassionFruit" },
            { name: "草莓", id: "qtyStrawberry" }
        ];
        let orderDetails = "";
        let totalCount = 0;
        let qStickPrice = 0;
        
        flavorData.forEach(flavor => {
            let quantity = parseInt(document.getElementById(flavor.id)?.value) || 0;
            if (quantity > 0) {
                orderDetails += `${flavor.name}：${quantity} 枝\n`;
                totalCount += quantity;
                qStickPrice += quantity * 14;
            }
        });
        
        let shippingFee = 0;
        if (totalCount >= 10 && totalCount <= 30) {
            shippingFee = 160;
        } else if (totalCount >= 40 && totalCount <= 120) {
            shippingFee = 225;
        } else if (totalCount >= 130 && totalCount <= 240) {
            shippingFee = 290;
        } else if (totalCount >= 250) {
            shippingFee = 0;
        }
        let totalPrice = qStickPrice + shippingFee;
        
        return { orderDetails, totalCount, qStickPrice, shippingFee, totalPrice };
    }

    // 顯示感謝訊息的自定義模態框
    function showThankYouModal() {
        const thankYouMessage = `非常感謝您的填寫，再麻煩您通知負責人員您已完成填單，以確認您的訂單與付訂，尚未付訂前皆未完成訂購程序喔^^
若已超過服務時間(10:00-22:00)，則翌日處理，謝謝您^^
※請注意再與服務人員確認且付訂前，此筆訂單尚未成立。`;

        const thankYouOverlay = document.createElement("div");
        thankYouOverlay.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.3); z-index: 9999;";
        
        const thankYouBox = document.createElement("div");
        thankYouBox.style = `
            position: fixed;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            background: #fff;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.2);
            width: 90%; max-width: 400px;
            z-index: 10000; text-align: center;
        `;
        
        const messageText = document.createElement("p");
        messageText.style = "font-size: 16px; white-space: pre-line; text-align: left;";
        messageText.textContent = thankYouMessage;
        
        const closeButton = document.createElement("button");
        closeButton.textContent = "確認";
        closeButton.style = "background: #ff6600; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-top: 15px;";
        
        const closeHandler = () => {
            document.body.removeChild(thankYouBox);
            document.body.removeChild(thankYouOverlay);
            window.location.reload(); 
        };

        closeButton.onclick = closeHandler;
        thankYouBox.appendChild(messageText);
        thankYouBox.appendChild(closeButton);
        document.body.appendChild(thankYouOverlay);
        document.body.appendChild(thankYouBox);
    }

    // 表單提交事件
    orderForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        console.log("Form submitted, validating...");
        
        // 取得提交按鈕對象
        const submitBtnOnPage = event.submitter || orderForm.querySelector("button[type='submit']");
        const originalBtnText = submitBtnOnPage.textContent || submitBtnOnPage.value;
        
        // 定義一個恢復按鈕狀態的功能，避免重複代碼並防止狀態卡死
        const resetSubmitBtn = () => {
            submitBtnOnPage.disabled = false;
            if (submitBtnOnPage.tagName === "BUTTON") {
                submitBtnOnPage.textContent = originalBtnText;
            } else {
                submitBtnOnPage.value = originalBtnText;
            }
        };

        // 1. 必填欄位驗證
        let requiredFields = [
            { id: "customerName", label: "收件人姓名" },
            { id: "phoneNumber", label: "收件人電話" },
            { id: "orderUnit", label: "配送地址" },
            { id: "eventDate", label: "到貨日期" },
            { id: "deliveryTime", label: "希望配達時段" },
            { id: "packingMethod", label: "分裝方式" }
        ];
        let missingFields = [];
        requiredFields.forEach(field => {
            let input = document.getElementById(field.id);
            if (!input || !input.value.trim()) {
                missingFields.push(field.label);
                if (input) input.style.border = "2px solid red";
            } else {
                if (input) input.style.border = "";
            }
        });
        if (missingFields.length > 0) {
            alert("請填寫以下欄位：\n\n" + missingFields.join("\n"));
            console.log("Missing fields:", missingFields);
            resetSubmitBtn(); // 驗證失敗，恢復按鈕
            return;
        }
        
        // 2. 日期驗證
        const eventDate = document.getElementById("eventDate").value.trim();
        const today = new Date();
        today.setHours(0, 0, 0, 0); 
        const selectedDate = new Date(eventDate);
        if (selectedDate < today) {
            alert("到貨日期必須為今天或以後，請重新選擇日期。");
            document.getElementById("eventDate").style.border = "2px solid red";
            resetSubmitBtn(); // 驗證失敗，恢復按鈕
            return;
        }
        
        // 3. 數量驗證
        const { orderDetails, totalCount, qStickPrice, shippingFee, totalPrice } = getOrderDetails();
        if (totalCount % 10 !== 0 || totalCount === 0) {
            alert("總數量須為10的倍數喔，再麻煩您調整數量喔😊。");
            resetSubmitBtn(); // 驗證失敗，恢復按鈕
            return;
        }

        // 4. 開始產能核對（鎖定按鈕）
        submitBtnOnPage.disabled = true;
        if (submitBtnOnPage.tagName === "BUTTON") {
            submitBtnOnPage.textContent = "正在核對產能中...";
        } else {
            submitBtnOnPage.value = "正在核對產能中...";
        }

        // 強迫 UI 渲染
        await new Promise(resolve => setTimeout(resolve, 50));

        try {
            const res = await fetch(gasUrl, {
                method: "POST",
                body: JSON.stringify({ eventDate, totalCount, orderType: "delivery" })
            });
            const result = await res.json();
            
            if (result.status === "error") {
                alert(result.message);
                resetSubmitBtn(); // 產能不足，恢復按鈕文字與狀態
                return;
            }
        } catch (e) {
            console.error("Capacity check failed:", e);
            alert("產能核對系統連線異常，請檢查網路或稍後再試。");
            resetSubmitBtn(); // 網路出錯，恢復按鈕文字與狀態
            return;
        }

        // 產能核對成功，顯示確認視窗前將按鈕恢復，以便使用者如果「返回」可以再次點擊
        resetSubmitBtn();
        
        // 5. 取得剩餘表單資料並生成確認視窗
        const customerName = document.getElementById("customerName").value.trim();
        const phoneNumber = document.getElementById("phoneNumber").value.trim();
        const orderUnit = document.getElementById("orderUnit").value.trim();
        const invoiceTitle = document.getElementById("invoiceTitle").value.trim();
        const invoiceNumber = document.getElementById("invoiceNumber").value.trim();
        const deliveryTime = document.getElementById("deliveryTime").value.trim();
        const packingMethod = document.getElementById("packingMethod").value.trim();
        
        let confirmationMessage = `請確認您的訂單資訊，若正確無誤請點選右下方"送出"：\n\n\n`;
        confirmationMessage += `📌 收件人姓名：${customerName}\n\n`;
        confirmationMessage += `📞 收件人電話：${phoneNumber}\n\n`;
        confirmationMessage += `🏠 配送地址：${orderUnit}\n\n`;
        confirmationMessage += `📅 到貨日期：${eventDate}\n\n`;
        confirmationMessage += `⏰ 希望配達時段：${deliveryTime}\n\n`;
        confirmationMessage += `📦 分裝方式：${packingMethod}\n\n`;
        if (invoiceTitle) confirmationMessage += `🧾 收據抬頭：${invoiceTitle}\n\n`;
        if (invoiceNumber) confirmationMessage += `💳 統一編號：${invoiceNumber}\n\n`;
        confirmationMessage += `✮✯✮✯✮✯✮\n\n`;
        confirmationMessage += `🛒 訂購內容：\n${orderDetails}\n\n`;
        const boxesConfirm = Number.isInteger(totalCount / 10) ? (totalCount / 10) : (totalCount / 10).toFixed(1);
        confirmationMessage += `🔢 總枝數：${totalCount} 枝，共 ${boxesConfirm} 盒\n\n`;
        confirmationMessage += `⤷ Q棒價格為 ${qStickPrice} 元\n`;
        confirmationMessage += `⤷ 運費價格為 ${shippingFee} 元\n\n`;
        confirmationMessage += `總金額：${totalPrice} 元。\n`;
        
        let confirmBox = document.createElement("div");
        confirmBox.style = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #fff; padding: 20px; border-radius: 10px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.2); width: 90%; max-width: 500px;
            max-height: 80vh; overflow-y: auto; z-index: 10000; text-align: left;
        `;
        let messageText = document.createElement("p");
        messageText.style = "font-size: 16px; white-space: pre-line;";
        messageText.textContent = confirmationMessage;
        let buttonContainer = document.createElement("div");
        buttonContainer.style = "display: flex; justify-content: space-between; margin-top: 20px;";
        let cancelButton = document.createElement("button");
        cancelButton.textContent = "返回";
        cancelButton.style = "background: #ccc; color: #000; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;";
        
        const overlay = document.createElement("div");
        overlay.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.3); z-index: 9999;";

        cancelButton.onclick = () => {
            document.body.removeChild(confirmBox);
            document.body.removeChild(overlay);
        };

        let submitButton = document.createElement("button");
        submitButton.textContent = "送出";
        submitButton.style = "background: #ff6600; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;";
        
        submitButton.onclick = () => {
            submitButton.disabled = true;
            submitButton.textContent = "處理中...";
            document.body.removeChild(confirmBox);
            document.body.removeChild(overlay);
            
            const formData = new FormData();
            formData.append("entry.707832955", customerName);
            formData.append("entry.148881326", phoneNumber);
            formData.append("entry.1115123397", orderUnit);
            formData.append("entry.1649301154", invoiceTitle);
            formData.append("entry.523433656", invoiceNumber);
            formData.append("entry.1853241713", eventDate);
            formData.append("entry.942601137", deliveryTime);
            formData.append("entry.1598893216", packingMethod);
            formData.append("entry.1820487257", document.getElementById("qtyDuoDuo").value || "0");
            formData.append("entry.2120858558", document.getElementById("qtyGrape").value || "0");
            formData.append("entry.1136794131", document.getElementById("qtyLychee").value || "0");
            formData.append("entry.1439982112", document.getElementById("qtyPassionFruit").value || "0");
            formData.append("entry.1813285675", document.getElementById("qtyStrawberry").value || "0");
            formData.append("entry.1400692215", totalCount.toString());
            formData.append("entry.1473298831", qStickPrice.toString());
            formData.append("entry.1548748978", shippingFee.toString());
            formData.append("entry.1440063522", totalPrice.toString());
            
            fetch("https://docs.google.com/forms/d/e/1FAIpQLScOiw6rFsnau8AxHKxr3zHgTofSyg6dIrky4Nhx7xoLqf8EWQ/formResponse", {
                method: "POST",
                mode: "no-cors",
                body: formData
            });
            
            orderForm.reset();
            calculateTotal();
            window.requestAnimationFrame(() => showThankYouModal());
        };
        
        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(submitButton);
        confirmBox.appendChild(messageText);
        confirmBox.appendChild(buttonContainer);
        document.body.appendChild(overlay);
        document.body.appendChild(confirmBox);
    });
    
    calculateTotal();
    
    function parseLocalDate(dateStr) {
        const [year, month, day] = dateStr.split("-");
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
});
