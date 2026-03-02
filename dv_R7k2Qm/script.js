document.addEventListener("DOMContentLoaded", function () {
    console.log("DOM fully loaded, initializing form...");

    // API 與 Google Form 設定
    const gasUrl = "https://script.google.com/macros/s/AKfycbzE7wP4x3S5k9BOpooS7VkiYMPYdPP2Wx9KDWaOnXZ5GLtWqE1OCHnBnjIy8jQQdWjK/exec";
    const googleFormAction = "https://docs.google.com/forms/d/e/1FAIpQLScOiw6rFsnau8AxHKxr3zHgTofSyg6dIrky4Nhx7xoLqf8EWQ/formResponse";

    // 取得元件
    const orderForm = document.getElementById("orderForm");
    const totalCountText = document.getElementById("totalCountText");
    const eventDateInput = document.getElementById("eventDate");

    if (!orderForm || !totalCountText || !eventDateInput) {
        console.error("找不到必要的表單元素，請檢查 HTML ID 是否正確。");
        return;
    }

    // 初始化狀態
    orderForm.reset();
    updateTotalDisplay(0, 0, 0, false);

    // 初始化日曆 (flatpickr)
    const eventDatePicker = flatpickr("#eventDate", {
        dateFormat: "Y-m-d",
        minDate: "today",
        maxDate: new Date().fp_incr(180)
    });

    // 監聽日期變動
    eventDateInput.addEventListener("change", function () {
        if (!this.value) return;
        const selectedDate = new Date(this.value);
        selectedDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
            alert("請選擇今天或之後的日期");
            this.value = "";
        }
    });

    // 限制數字輸入
    const restrictToNumbers = (id) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", function() { this.value = this.value.replace(/\D/g, ""); });
    };
    ["phoneNumber", "invoiceNumber", "qtyDuoDuo", "qtyGrape", "qtyLychee", "qtyPassionFruit", "qtyStrawberry"].forEach(restrictToNumbers);

    // 數量輸入監聽
    document.querySelectorAll(".flavor-item input").forEach(input => {
        input.addEventListener("input", calculateTotal);
    });

    // 發票資訊顯示切換
    const showInvoiceInfo = document.getElementById("showInvoiceInfo");
    const invoiceSection = document.getElementById("invoiceSection");
    if (showInvoiceInfo && invoiceSection) {
        showInvoiceInfo.addEventListener("change", function () {
            invoiceSection.style.display = this.checked ? "flex" : "none";
        });
    }

    // 計算總數與金額
    function calculateTotal() {
        const { totalCount, totalPrice, shippingFee, qStickPrice } = getOrderDetails();
        const isValid = totalCount % 10 === 0 && totalCount > 0;
        updateTotalDisplay(totalCount, totalPrice, shippingFee, isValid);
    }

    function getOrderDetails() {
        const flavors = [
            { id: "qtyDuoDuo", name: "多多" },
            { id: "qtyGrape", name: "葡萄" },
            { id: "qtyLychee", name: "荔枝" },
            { id: "qtyPassionFruit", name: "百香" },
            { id: "qtyStrawberry", name: "草莓" }
        ];
        
        let orderDetails = "";
        let totalCount = 0;

        flavors.forEach(f => {
            const val = parseInt(document.getElementById(f.id)?.value) || 0;
            if (val > 0) {
                orderDetails += `${f.name}：${val} 枝\n`;
                totalCount += val;
            }
        });

        const qStickPrice = totalCount * 14;
        let shippingFee = 0;
        if (totalCount >= 10 && totalCount <= 30) shippingFee = 160;
        else if (totalCount >= 40 && totalCount <= 120) shippingFee = 225;
        else if (totalCount >= 130 && totalCount <= 240) shippingFee = 290;
        else if (totalCount >= 250) shippingFee = 0;

        return { orderDetails, totalCount, qStickPrice, shippingFee, totalPrice: qStickPrice + shippingFee };
    }

    function updateTotalDisplay(totalCount, totalPrice, shippingFee, isValid) {
        const boxes = totalCount / 10;
        let html = `
            <div class="total-summary">
                <div class="total-row">總枝數: <strong>${totalCount}</strong> 枝，共 <strong>${boxes}</strong> 盒。</div>`;
        
        if (totalCount > 0) {
            if (isValid) {
                html += `
                    <div class="total-sub">⤷ Q棒價格: <strong>${totalCount * 14}</strong> 元</div>
                    <div class="total-sub">⤷ 運費: <strong>${shippingFee}</strong> 元</div>
                    <div class="total-row">總金額: <strong>${totalPrice}</strong> 元</div>`;
            } else {
                html += `<div class="total-row error-text">總數量須為10的倍數喔😊</div>`;
            }
        }
        html += `</div>`;
        totalCountText.innerHTML = html;
    }

    // 表單提交與產能核對
    orderForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        
        const requiredFields = [
            { id: "customerName", label: "收件人姓名" },
            { id: "phoneNumber", label: "收件人電話" },
            { id: "orderUnit", label: "配送地址" },
            { id: "eventDate", label: "到貨日期" },
            { id: "deliveryTime", label: "希望配達時段" },
            { id: "packingMethod", label: "分裝方式" }
        ];

        let missing = [];
        requiredFields.forEach(f => {
            const el = document.getElementById(f.id);
            if (!el || !el.value.trim()) {
                missing.push(f.label);
                if (el) el.style.border = "2px solid red";
            } else { if (el) el.style.border = ""; }
        });

        if (missing.length > 0) return alert("請填寫：\n" + missing.join("\n"));

        const { orderDetails, totalCount, totalPrice } = getOrderDetails();
        if (totalCount === 0 || totalCount % 10 !== 0) return alert("總數量須為10的倍數喔😊");

        const submitBtn = orderForm.querySelector("button[type='submit']");
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = "正在核對產能中...";

        try {
            const eventDate = document.getElementById("eventDate").value;
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
            
            showConfirmModal(orderDetails, totalCount, totalPrice, submitBtn, originalText);
            
        } catch (e) {
            alert("產能核對系統連線失敗，請稍後再試。");
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });

    function showConfirmModal(orderDetails, totalCount, totalPrice, mainSubmitBtn, originalText) {
        const data = {
            name: document.getElementById("customerName").value,
            phone: document.getElementById("phoneNumber").value,
            addr: document.getElementById("orderUnit").value,
            date: document.getElementById("eventDate").value,
            time: document.getElementById("deliveryTime").value,
            pack: document.getElementById("packingMethod").value,
            title: document.getElementById("invoiceTitle")?.value || "無",
            no: document.getElementById("invoiceNumber")?.value || "無"
        };

        const overlay = document.createElement("div");
        overlay.className = "modal-overlay"; 
        overlay.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999;";
        
        const modal = document.createElement("div");
        modal.style = "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #fff; padding: 20px; border-radius: 12px; width: 90%; max-width: 450px; z-index: 10000; box-shadow: 0 4px 20px rgba(0,0,0,0.3);";
        
        modal.innerHTML = `
            <div style="font-size: 15px; line-height: 1.6;">
                <p>📌 收件人：${data.name}<br>📞 電話：${data.phone}<br>🏠 地址：${data.addr}<br>📅 日期：${data.date}<br>⏰ 時段：${data.time}<br>📦 分裝：${data.pack}</p>
                <p>🧾 抬頭：${data.title}<br>💳 統編：${data.no}</p>
                <hr>
                <p>🛒 內容：<br>${orderDetails.replace(/\n/g, '<br>')}</p>
                <p>🔢 總枝數：${totalCount}<br>💰 總金額：<strong>${totalPrice}</strong> 元</p>
            </div>
            <div style="display:flex; justify-content:space-between; margin-top:20px;">
                <button id="btnBack" style="padding:10px 20px; border-radius:5px; border:1px solid #ccc; cursor:pointer;">返回</button>
                <button id="btnFinalSend" style="padding:10px 20px; border-radius:5px; background:#ff6600; color:#fff; border:none; cursor:pointer;">確認送出</button>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(modal);

        document.getElementById("btnBack").onclick = () => {
            overlay.remove(); modal.remove();
            mainSubmitBtn.disabled = false;
            mainSubmitBtn.textContent = originalText;
        };

        document.getElementById("btnFinalSend").onclick = async function() {
            this.disabled = true;
            this.textContent = "傳送中...";

            const fd = new FormData();
            fd.append("entry.707832955", data.name);
            fd.append("entry.148881326", data.phone);
            fd.append("entry.1115123397", data.addr);
            fd.append("entry.1649301154", data.title);
            fd.append("entry.523433656", data.no);
            fd.append("entry.1853241713", data.date);
            fd.append("entry.942601137", data.time);
            fd.append("entry.1598893216", data.pack);
            fd.append("entry.1820487257", document.getElementById("qtyDuoDuo")?.value || "0");
            fd.append("entry.2120858558", document.getElementById("qtyGrape")?.value || "0");
            fd.append("entry.1136794131", document.getElementById("qtyLychee")?.value || "0");
            fd.append("entry.1439982112", document.getElementById("qtyPassionFruit")?.value || "0");
            fd.append("entry.1813285675", document.getElementById("qtyStrawberry")?.value || "0");
            fd.append("entry.1400692215", totalCount);
            fd.append("entry.1440063522", totalPrice);

            try {
                await fetch(googleFormAction, { method: "POST", mode: "no-cors", body: fd });
                overlay.remove(); modal.remove();
                showThankYouModal();
            } catch (err) {
                alert("提交至 Google 表單失敗，請稍後再試。");
                this.disabled = false;
                this.textContent = "確認送出";
            }
        };
    }

    function showThankYouModal() {
        const div = document.createElement("div");
        div.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: white; z-index: 10001; display: flex; align-items: center; justify-content: center; text-align: center;";
        div.innerHTML = `<div><h2>感謝您的訂購！</h2><p>我們已收到您的資訊，將盡快為您處理。</p><button onclick="location.reload()" style="padding:10px 20px; background:#ff6600; color:white; border:none; border-radius:5px; cursor:pointer;">返回首頁</button></div>`;
        document.body.appendChild(div);
    }
});
