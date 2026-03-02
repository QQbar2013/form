document.addEventListener("DOMContentLoaded", function () {
    console.log("DOM fully loaded, initializing form...");
    
    // [新增] 產能核對 API 網址
    const gasUrl = "https://script.google.com/macros/s/AKfycbzE7wP4x3S5k9BOpooS7VkiYMPYdPP2Wx9KDWaOnXZ5GLtWqE1OCHnBnjIy8jQQdWjK/exec";
    
    // 確認表單元素存在
    const orderForm = document.getElementById("orderForm");
    const totalCountText = document.getElementById("totalCountText");
    const eventDateInput = document.getElementById("eventDate");
    
    if (!orderForm || !totalCountText || !eventDateInput) {
        console.error("Required elements not found.");
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
        minDate: "today",
        maxDate: new Date().fp_incr(180)
    });
    
    // 限制日期範圍
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
            }
        }, 1500);
    });
    
    // 限制輸入數字的通用函式
    const restrictToNumbers = (id) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", function() { this.value = this.value.replace(/\D/g, ""); });
    };
    restrictToNumbers("phoneNumber");
    restrictToNumbers("invoiceNumber");
    
    // 限制口味輸入框並觸發計算
    const flavorInputs = document.querySelectorAll(".flavor-item input[type='text']");
    flavorInputs.forEach(input => {
        input.addEventListener("input", function () {
            this.value = this.value.replace(/\D/g, "");
            calculateTotal();
        });
    });
    
    // 發票區塊控制
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
    
    // 計算總計
    function calculateTotal() {
        let totalCount = 0;
        const flavorIds = ["qtyDuoDuo", "qtyGrape", "qtyLychee", "qtyPassionFruit", "qtyStrawberry"];
        flavorIds.forEach(id => {
            const input = document.getElementById(id);
            if (input) totalCount += (parseInt(input.value) || 0);
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
            
            if (isValid) {
                displayText += `<div class="total-sub">⤷ Q棒價格為 <strong>${qStickPrice}</strong> 元。</div>`;
                displayText += `<div class="total-sub">⤷ 運費價格為 <strong>${shippingFee}</strong> 元。</div>`;
                displayText += `<div class="total-row">總金額: <strong>${qStickPrice + shippingFee}</strong> 元。</div>`;
            } else {
                displayText += `<div class="total-row error-text">總數量須為10的倍數喔😊</div>`;
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
        return { orderDetails, totalCount, qStickPrice, shippingFee, totalPrice: qStickPrice + shippingFee };
    }

    function showThankYouModal() {
        const thankYouMessage = `非常感謝您的填寫，再麻煩您通知負責人員您已完成填單，以確認您的訂單與付訂，尚未付訂前皆未完成訂購程序喔^^
若已超過服務時間(10:00-22:00)，則翌日處理，謝謝您^^
※請注意再與服務人員確認且付訂前，此筆訂單尚未成立。`;

        const thankYouOverlay = document.createElement("div");
        thankYouOverlay.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.3); z-index: 999;";
        const thankYouBox = document.createElement("div");
        thankYouBox.style = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #fff; padding: 20px; border-radius: 10px; width: 90%; max-width: 400px; z-index: 1001; text-align: center;`;
        thankYouBox.innerHTML = `<p style="text-align:left; white-space:pre-line;">${thankYouMessage}</p><button id="finalClose" style="background:#ff6600; color:white; border:none; padding:10px 20px; border-radius:5px; cursor:pointer; margin-top:15px;">確認</button>`;
        document.body.appendChild(thankYouOverlay); document.body.appendChild(thankYouBox);
        document.getElementById("finalClose").onclick = () => window.location.reload();
    }

    // 表單提交事件 (改為 async 以支援產能核對)
    orderForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        
        // 1. 必填驗證
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
        
        const { orderDetails, totalCount, qStickPrice, shippingFee, totalPrice } = getOrderDetails();
        if (totalCount % 10 !== 0 || totalCount === 0) { alert("總數量須為10的倍數喔😊"); return; }

        // 2. 產能核對階段
        const submitBtn = event.submitter || orderForm.querySelector("button[type='submit']");
        const originalText = submitBtn.textContent || submitBtn.value;
        
        submitBtn.disabled = true;
        submitBtn.textContent = "正在核對產能中...";

        const eventDate = document.getElementById("eventDate").value.trim();
        try {
            const res = await fetch(gasUrl, {
                method: "POST",
                body: JSON.stringify({ eventDate, totalCount, orderType: "delivery" })
            });
            const result = await res.json();
            if (result.status === "error") {
                alert(result.message);
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                return;
            }
        } catch (e) {
            alert("系統連線異常，請稍後再試。");
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            return;
        }

        // 3. 產能 OK，生成確認視窗
        const customerName = document.getElementById("customerName").value.trim();
        const phoneNumber = document.getElementById("phoneNumber").value.trim();
        const orderUnit = document.getElementById("orderUnit").value.trim();
        const invoiceTitle = document.getElementById("invoiceTitle").value.trim();
        const invoiceNumber = document.getElementById("invoiceNumber").value.trim();
        const deliveryTime = document.getElementById("deliveryTime").value.trim();
        const packingMethod = document.getElementById("packingMethod").value.trim();

        let confirmationMessage = `📌 收件人：${customerName}\n📞 電話：${phoneNumber}\n🏠 地址：${orderUnit}\n📅 日期：${eventDate}\n⏰ 時段：${deliveryTime}\n📦 分裝：${packingMethod}\n`;
        if (invoiceTitle) confirmationMessage += `🧾 抬頭：${invoiceTitle}\n💳 統編：${invoiceNumber}\n`;
        confirmationMessage += `\n🛒 內容：\n${orderDetails}\n🔢 總枝數：${totalCount}\n💰 總金額：${totalPrice} 元`;

        const overlay = document.createElement("div");
        overlay.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.3); z-index: 999;";
        const confirmBox = document.createElement("div");
        confirmBox.style = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #fff; padding: 20px; border-radius: 10px; width: 90%; max-width: 500px; z-index: 1000; max-height: 80vh; overflow-y: auto;`;
        confirmBox.innerHTML = `<p style="white-space:pre-line; font-size:16px;">${confirmationMessage}</p><div style="display:flex; justify-content:space-between; margin-top:20px;"><button id="btnBack" style="background:#ccc; padding:10px 20px; border-radius:5px; cursor:pointer; border:none;">返回</button><button id="btnSend" style="background:#ff6600; color:white; padding:10px 20px; border-radius:5px; cursor:pointer; border:none;">確認送出</button></div>`;
        
        document.body.appendChild(overlay); document.body.appendChild(confirmBox);

        // 按下返回：恢復主按鈕狀態
        document.getElementById("btnBack").onclick = () => {
            document.body.removeChild(confirmBox); document.body.removeChild(overlay);
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        };

        // 按下確定送出：正式傳送到 Google Form
        document.getElementById("btnSend").onclick = () => {
            document.getElementById("btnSend").disabled = true;
            document.getElementById("btnSend").textContent = "送出中...";
            
            const fd = new FormData();
            fd.append("entry.707832955", customerName); fd.append("entry.148881326", phoneNumber);
            fd.append("entry.1115123397", orderUnit); fd.append("entry.1649301154", invoiceTitle);
            fd.append("entry.523433656", invoiceNumber); fd.append("entry.1853241713", eventDate);
            fd.append("entry.942601137", deliveryTime); fd.append("entry.1598893216", packingMethod);
            fd.append("entry.1820487257", document.getElementById("qtyDuoDuo").value || "0");
            fd.append("entry.2120858558", document.getElementById("qtyGrape").value || "0");
            fd.append("entry.1136794131", document.getElementById("qtyLychee").value || "0");
            fd.append("entry.1439982112", document.getElementById("qtyPassionFruit").value || "0");
            fd.append("entry.1813285675", document.getElementById("qtyStrawberry").value || "0");
            fd.append("entry.1400692215", totalCount); fd.append("entry.1440063522", totalPrice);

            fetch("https://docs.google.com/forms/d/e/1FAIpQLScOiw6rFsnau8AxHKxr3zHgTofSyg6dIrky4Nhx7xoLqf8EWQ/formResponse", { method: "POST", mode: "no-cors", body: fd })
            .then(() => {
                document.body.removeChild(confirmBox); document.body.removeChild(overlay);
                showThankYouModal();
            });
        };
    });
    
    function parseLocalDate(s) { const [y, m, d] = s.split("-"); return new Date(y, m - 1, d); }
    calculateTotal();
});
