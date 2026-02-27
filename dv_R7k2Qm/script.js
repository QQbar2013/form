document.addEventListener("DOMContentLoaded", function () {
    console.log("DOM fully loaded, initializing form...");
    
    // [新增] 產能核對 API 網址
    const gasUrl = "https://script.google.com/macros/s/AKfycbzE7wP4x3S5k9BOpooS7VkiYMPYdPP2Wx9KDWaOnXZ5GLtWqE1OCHnBnjIy8jQQdWjK/exec";
    
    const orderForm = document.getElementById("orderForm");
    const totalCountText = document.getElementById("totalCountText");
    const eventDateInput = document.getElementById("eventDate");
    
    if (!orderForm || !totalCountText || !eventDateInput) return;
    
    orderForm.reset();
    totalCountText.innerHTML = `<div class="total-summary"><div class="total-row">總枝數: <strong>0</strong> 枝。</div></div>`;
    
    const eventDatePicker = flatpickr("#eventDate", {
        dateFormat: "Y-m-d",
        minDate: "today",
        maxDate: new Date().fp_incr(180)
    });
    
    // 限制輸入數字
    const setNumericOnly = (id) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", function() { this.value = this.value.replace(/\D/g, ""); });
    };
    setNumericOnly("phoneNumber");
    setNumericOnly("invoiceNumber");
    
    document.querySelectorAll(".flavor-item input[type='text']").forEach(input => {
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
        });
    }

    function calculateTotal() {
        let totalCount = 0;
        ["qtyDuoDuo", "qtyGrape", "qtyLychee", "qtyPassionFruit", "qtyStrawberry"].forEach(id => {
            totalCount += (parseInt(document.getElementById(id).value) || 0);
        });
        let boxes = totalCount / 10;
        let displayText = `<div class="total-summary"><div class="total-row">總枝數: <strong>${totalCount}</strong> 枝，共 <strong>${boxes}</strong> 盒。</div>`;
        if (totalCount > 0 && totalCount % 10 !== 0) displayText += `<div class="total-row error-text">總數量須為10的倍數喔😊</div>`;
        displayText += `</div>`;
        totalCountText.innerHTML = displayText;
    }

    function getOrderDetails() {
        const flavors = [{name:"多多",id:"qtyDuoDuo"},{name:"葡萄",id:"qtyGrape"},{name:"荔枝",id:"qtyLychee"},{name:"百香",id:"qtyPassionFruit"},{name:"草莓",id:"qtyStrawberry"}];
        let orderDetails = ""; let totalCount = 0;
        flavors.forEach(f => {
            let qty = parseInt(document.getElementById(f.id)?.value) || 0;
            if (qty > 0) { orderDetails += `${f.name}：${qty} 枝\n`; totalCount += qty; }
        });
        let shippingFee = totalCount >= 250 ? 0 : (totalCount >= 130 ? 290 : (totalCount >= 40 ? 225 : 160));
        let qStickPrice = totalCount * 14;
        return { orderDetails, totalCount, qStickPrice, shippingFee, totalPrice: qStickPrice + shippingFee };
    }

    function showThankYouModal() {
        const overlay = document.createElement("div");
        overlay.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.3); z-index: 999;";
        const box = document.createElement("div");
        box.style = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #fff; padding: 20px; border-radius: 10px; width: 90%; max-width: 400px; z-index: 1001; text-align: center;`;
        box.innerHTML = `<p style="text-align:left; white-space:pre-line;">非常感謝您的填寫...</p><button id="finalReload" style="background:#ff6600; color:white; padding:10px 20px; border:none; border-radius:5px; cursor:pointer;">確認</button>`;
        document.body.appendChild(overlay); document.body.appendChild(box);
        document.getElementById("finalReload").onclick = () => window.location.reload();
    }

    // 防止重複提交的 Flag
    let isProcessing = false;

    // 表單提交事件
    orderForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        if (isProcessing) return; // 如果正在處理中，直接擋掉

        // 1. 基本必填驗證
        let requiredFields = [{id:"customerName",label:"收件人姓名"},{id:"phoneNumber",label:"收件人電話"},{id:"orderUnit",label:"配送地址"},{id:"eventDate",label:"到貨日期"},{id:"deliveryTime",label:"時段"},{id:"packingMethod",label:"分裝"}];
        let missing = [];
        requiredFields.forEach(f => {
            let el = document.getElementById(f.id);
            if (!el || !el.value.trim()) { missing.push(f.label); if(el) el.style.border="2px red solid"; }
            else { if(el) el.style.border=""; }
        });
        if (missing.length > 0) { alert("請填寫：\n" + missing.join("\n")); return; }
        
        const { orderDetails, totalCount, qStickPrice, shippingFee, totalPrice } = getOrderDetails();
        if (totalCount % 10 !== 0 || totalCount === 0) { alert("總數量須為10的倍數喔😊"); return; }

        // 2. 開始核對產能
        isProcessing = true;
        const submitBtn = event.submitter || orderForm.querySelector("input[type='submit']");
        const originalText = submitBtn.value || submitBtn.textContent;
        
        const resetBtn = () => {
            isProcessing = false;
            submitBtn.disabled = false;
            if (submitBtn.tagName === "INPUT") submitBtn.value = originalText;
            else submitBtn.textContent = originalText;
        };

        submitBtn.disabled = true;
        if (submitBtn.tagName === "INPUT") submitBtn.value = "正在核對產能中...";
        else submitBtn.textContent = "正在核對產能中...";

        const eventDate = document.getElementById("eventDate").value;

        try {
            const res = await fetch(gasUrl, {
                method: "POST",
                body: JSON.stringify({ eventDate, totalCount, orderType: "delivery" })
            });
            const result = await res.json();
            if (result.status === "error") {
                alert(result.message);
                resetBtn();
                return;
            }
        } catch (e) {
            alert("系統連線異常，請稍後再試。");
            resetBtn();
            return;
        }

        // 3. 產能核對成功，生成「唯一的」確認視窗
        const customerName = document.getElementById("customerName").value;
        const phoneNumber = document.getElementById("phoneNumber").value;
        const orderUnit = document.getElementById("orderUnit").value;
        const deliveryTime = document.getElementById("deliveryTime").value;
        const packingMethod = document.getElementById("packingMethod").value;

        let confirmMsg = `📌 姓名：${customerName}\n📞 電話：${phoneNumber}\n🏠 地址：${orderUnit}\n📅 日期：${eventDate}\n⏰ 時段：${deliveryTime}\n📦 分裝：${packingMethod}\n\n🛒 內容：\n${orderDetails}\n🔢 總枝數：${totalCount}\n💰 總金額：${totalPrice} 元`;

        const overlay = document.createElement("div");
        overlay.className = "modal-overlay"; // 加上 class 方便識別
        overlay.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.3); z-index: 999;";
        
        const confirmBox = document.createElement("div");
        confirmBox.className = "modal-box";
        confirmBox.style = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #fff; padding: 20px; border-radius: 10px; width: 90%; max-width: 500px; z-index: 1000;`;
        confirmBox.innerHTML = `<p style="white-space:pre-line;">${confirmMsg}</p><div style="display:flex; justify-content:space-between; margin-top:20px;"><button id="btnBack" style="background:#ccc; padding:10px 20px; border:none; border-radius:5px; cursor:pointer;">返回</button><button id="btnSend" style="background:#ff6600; color:white; padding:10px 20px; border:none; border-radius:5px; cursor:pointer;">正式送出</button></div>`;
        
        document.body.appendChild(overlay);
        document.body.appendChild(confirmBox);

        // ❌ 返回邏輯：確實清理並重置 Flag
        document.getElementById("btnBack").onclick = () => {
            document.body.removeChild(confirmBox);
            document.body.removeChild(overlay);
            resetBtn(); // 關鍵：清空狀態，讓使用者回到原本頁面
        };

        // ✅ 送出邏輯
        document.getElementById("btnSend").onclick = () => {
            document.getElementById("btnSend").disabled = true;
            document.body.removeChild(confirmBox);
            document.body.removeChild(overlay);

            const fd = new FormData();
            fd.append("entry.707832955", customerName); fd.append("entry.148881326", phoneNumber);
            fd.append("entry.1115123397", orderUnit); fd.append("entry.1853241713", eventDate);
            fd.append("entry.942601137", deliveryTime); fd.append("entry.1598893216", packingMethod);
            fd.append("entry.1820487257", document.getElementById("qtyDuoDuo").value || "0");
            fd.append("entry.2120858558", document.getElementById("qtyGrape").value || "0");
            fd.append("entry.1136794131", document.getElementById("qtyLychee").value || "0");
            fd.append("entry.1439982112", document.getElementById("qtyPassionFruit").value || "0");
            fd.append("entry.1813285675", document.getElementById("qtyStrawberry").value || "0");
            fd.append("entry.1400692215", totalCount); fd.append("entry.1440063522", totalPrice);

            fetch("https://docs.google.com/forms/d/e/1FAIpQLScOiw6rFsnau8AxHKxr3zHgTofSyg6dIrky4Nhx7xoLqf8EWQ/formResponse", { method: "POST", mode: "no-cors", body: fd })
            .then(() => { orderForm.reset(); calculateTotal(); showThankYouModal(); });
        };
    });

    function parseLocalDate(s) { const [y, m, d] = s.split("-"); return new Date(y, m - 1, d); }
});
