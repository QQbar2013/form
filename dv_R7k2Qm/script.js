document.addEventListener("DOMContentLoaded", function () {
    console.log("DOM fully loaded, initializing form...");
    
    // [新增] 產能核對 API 網址
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
    
    // 初始化 flatpickr
    const eventDatePicker = flatpickr("#eventDate", {
        dateFormat: "Y-m-d",
        minDate: "today",
        maxDate: new Date().fp_incr(180)
    });
    
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
    
    const phoneNumberInput = document.getElementById("phoneNumber");
    if (phoneNumberInput) {
        phoneNumberInput.addEventListener("input", function () {
            this.value = this.value.replace(/\D/g, "");
        });
    }
    
    const invoiceNumberInput = document.getElementById("invoiceNumber");
    if (invoiceNumberInput) {
        invoiceNumberInput.addEventListener("input", function () {
            this.value = this.value.replace(/\D/g, "");
        });
    }
    
    const flavorInputs = document.querySelectorAll(".flavor-item input[type='text']");
    flavorInputs.forEach(input => {
        input.addEventListener("input", function () {
            this.value = this.value.replace(/\D/g, "");
            calculateTotal();
        });
    });
    
    const showInvoiceInfo = document.getElementById("showInvoiceInfo");
    const invoiceSection = document.getElementById("invoiceSection");
    if (showInvoiceInfo && invoiceSection) {
        showInvoiceInfo.addEventListener("change", function () {
            invoiceSection.style.display = this.checked ? "flex" : "none";
            if (!this.checked) {
                document.getElementById("invoiceTitle").value = "";
                document.getElementById("invoiceNumber").value = "";
            }
        });
    }
    
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
            if (totalCount >= 10 && totalCount <= 30) shippingFee = 160;
            else if (totalCount >= 40 && totalCount <= 120) shippingFee = 225;
            else if (totalCount >= 130 && totalCount <= 240) shippingFee = 290;
            else if (totalCount >= 250) shippingFee = 0;
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
    }
    
    function getOrderDetails() {
        const flavorData = [
            { name: "多多", id: "qtyDuoDuo" }, { name: "葡萄", id: "qtyGrape" },
            { name: "荔枝", id: "qtyLychee" }, { name: "百香", id: "qtyPassionFruit" },
            { name: "草莓", id: "qtyStrawberry" }
        ];
        let orderDetails = ""; let totalCount = 0; let qStickPrice = 0;
        flavorData.forEach(flavor => {
            let quantity = parseInt(document.getElementById(flavor.id)?.value) || 0;
            if (quantity > 0) {
                orderDetails += `${flavor.name}：${quantity} 枝\n`;
                totalCount += quantity;
                qStickPrice += quantity * 14;
            }
        });
        let shippingFee = 0;
        if (totalCount >= 10 && totalCount <= 30) shippingFee = 160;
        else if (totalCount >= 40 && totalCount <= 120) shippingFee = 225;
        else if (totalCount >= 130 && totalCount <= 240) shippingFee = 290;
        else if (totalCount >= 250) shippingFee = 0;
        let totalPrice = qStickPrice + shippingFee;
        return { orderDetails, totalCount, qStickPrice, shippingFee, totalPrice };
    }

    function showThankYouModal() {
        const thankYouMessage = `非常感謝您的填寫，再麻煩您通知負責人員您已完成填單...`;
        const thankYouOverlay = document.createElement("div");
        thankYouOverlay.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.3); z-index: 999;";
        const thankYouBox = document.createElement("div");
        thankYouBox.style = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #fff; padding: 20px; border-radius: 10px; width: 90%; max-width: 400px; z-index: 1001; text-align: center;`;
        const messageText = document.createElement("p");
        messageText.style = "font-size: 16px; white-space: pre-line; text-align: left;";
        messageText.textContent = thankYouMessage;
        const closeButton = document.createElement("button");
        closeButton.textContent = "確認";
        closeButton.style = "background: #ff6600; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-top: 15px;";
        closeButton.onclick = () => { window.location.reload(); };
        thankYouBox.appendChild(messageText); thankYouBox.appendChild(closeButton);
        document.body.appendChild(thankYouOverlay); document.body.appendChild(thankYouBox);
    }

    // 關鍵修改處
    orderForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        
        let requiredFields = [
            { id: "customerName", label: "收件人姓名" }, { id: "phoneNumber", label: "收件人電話" },
            { id: "orderUnit", label: "配送地址" }, { id: "eventDate", label: "到貨日期" },
            { id: "deliveryTime", label: "希望配達時段" }, { id: "packingMethod", label: "分裝方式" }
        ];
        let missingFields = [];
        requiredFields.forEach(field => {
            let input = document.getElementById(field.id);
            if (!input || !input.value.trim()) { missingFields.push(field.label); if (input) input.style.border = "2px solid red"; }
            else { if (input) input.style.border = ""; }
        });
        if (missingFields.length > 0) { alert("請填寫以下欄位：\n\n" + missingFields.join("\n")); return; }
        
        const eventDate = document.getElementById("eventDate").value.trim();
        const { orderDetails, totalCount, qStickPrice, shippingFee, totalPrice } = getOrderDetails();
        
        if (totalCount % 10 !== 0 || totalCount === 0) { alert("總數量須為 10 的倍數喔😊。"); return; }

        const submitBtn = event.submitter || orderForm.querySelector("button[type='submit']") || orderForm.querySelector("input[type='submit']");
        let originalBtnValue = submitBtn.value || submitBtn.textContent;
        submitBtn.disabled = true;
        if (submitBtn.tagName === "INPUT") submitBtn.value = "正在核對產能中..."; else submitBtn.textContent = "正在核對產能中...";

        try {
            const checkResponse = await fetch(gasUrl, {
                method: "POST",
                body: JSON.stringify({ eventDate, totalCount, orderType: "delivery" })
            });
            const checkResult = await checkResponse.json();

            if (checkResult.status === "error") {
                alert(checkResult.message); // 此 alert 為產能錯誤提示，非確認視窗
                submitBtn.disabled = false;
                if (submitBtn.tagName === "INPUT") submitBtn.value = originalBtnValue; else submitBtn.textContent = originalBtnValue;
                return;
            }
        } catch (error) {
            alert("系統連線異常，請稍後再試。");
            submitBtn.disabled = false;
            return;
        }
        
        // 產能成功核對後，才執行視窗生成 (不恢復按鈕文字，直接進確認流程)
        const customerName = document.getElementById("customerName").value.trim();
        const phoneNumber = document.getElementById("phoneNumber").value.trim();
        const orderUnit = document.getElementById("orderUnit").value.trim();
        const invoiceTitle = document.getElementById("invoiceTitle").value.trim();
        const invoiceNumber = document.getElementById("invoiceNumber").value.trim();
        const deliveryTime = document.getElementById("deliveryTime").value.trim();
        const packingMethod = document.getElementById("packingMethod").value.trim();
        
        let confirmationMessage = `請確認您的訂單資訊：\n\n`;
        confirmationMessage += `📌 收件人姓名：${customerName}\n📞 收件人電話：${phoneNumber}\n🏠 配送地址：${orderUnit}\n📅 到貨日期：${eventDate}\n⏰ 希望配達時段：${deliveryTime}\n📦 分裝方式：${packingMethod}\n`;
        if (invoiceTitle) confirmationMessage += `🧾 收據抬頭：${invoiceTitle}\n💳 統一編號：${invoiceNumber}\n`;
        confirmationMessage += `\n🛒 訂購內容：\n${orderDetails}\n🔢 總枝數：${totalCount} 枝\n⤷ Q棒：${qStickPrice} 元\n⤷ 運費：${shippingFee} 元\n\n總金額：${totalPrice} 元。`;
        
        let confirmBox = document.createElement("div");
        confirmBox.style = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #fff; padding: 20px; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.2); width: 90%; max-width: 500px; max-height: 80vh; overflow-y: auto; z-index: 1000; text-align: left;`;
        let messageText = document.createElement("p");
        messageText.style = "font-size: 16px; white-space: pre-line;";
        messageText.textContent = confirmationMessage;
        let buttonContainer = document.createElement("div");
        buttonContainer.style = "display: flex; justify-content: space-between; margin-top: 20px;";
        let cancelButton = document.createElement("button");
        cancelButton.textContent = "返回";
        cancelButton.style = "background: #ccc; color: #000; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;";
        cancelButton.onclick = () => {
            document.body.removeChild(confirmBox); document.body.removeChild(overlay);
            submitBtn.disabled = false;
            if (submitBtn.tagName === "INPUT") submitBtn.value = originalBtnValue; else submitBtn.textContent = originalBtnValue;
        };
        let submitButton = document.createElement("button");
        submitButton.textContent = "送出";
        submitButton.style = "background: #ff6600; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;";
        submitButton.onclick = () => {
            submitButton.disabled = true; submitButton.textContent = "處理中...";
            document.body.removeChild(confirmBox); document.body.removeChild(overlay);
            const formData = new FormData();
            formData.append("entry.707832955", customerName); formData.append("entry.148881326", phoneNumber);
            formData.append("entry.1115123397", orderUnit); formData.append("entry.1649301154", invoiceTitle);
            formData.append("entry.523433656", invoiceNumber); formData.append("entry.1853241713", eventDate);
            formData.append("entry.942601137", deliveryTime); formData.append("entry.1598893216", packingMethod);
            formData.append("entry.1820487257", document.getElementById("qtyDuoDuo").value || "0");
            formData.append("entry.2120858558", document.getElementById("qtyGrape").value || "0");
            formData.append("entry.1136794131", document.getElementById("qtyLychee").value || "0");
            formData.append("entry.1439982112", document.getElementById("qtyPassionFruit").value || "0");
            formData.append("entry.1813285675", document.getElementById("qtyStrawberry").value || "0");
            formData.append("entry.1400692215", totalCount.toString()); formData.append("entry.1473298831", qStickPrice.toString());
            formData.append("entry.1548748978", shippingFee.toString()); formData.append("entry.1440063522", totalPrice.toString());
            
            fetch("https://docs.google.com/forms/d/e/1FAIpQLScOiw6rFsnau8AxHKxr3zHgTofSyg6dIrky4Nhx7xoLqf8EWQ/formResponse", { method: "POST", mode: "no-cors", body: formData })
            .then(() => { orderForm.reset(); calculateTotal(); window.requestAnimationFrame(showThankYouModal); });
        };
        buttonContainer.appendChild(cancelButton); buttonContainer.appendChild(submitButton);
        confirmBox.appendChild(messageText); confirmBox.appendChild(buttonContainer);
        const overlay = document.createElement("div");
        overlay.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.3); z-index: 999;";
        document.body.appendChild(overlay); document.body.appendChild(confirmBox);
    });
    
    calculateTotal();
    function parseLocalDate(dateStr) { const [year, month, day] = dateStr.split("-"); return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)); }
});
