document.addEventListener("DOMContentLoaded", function () {
    // 防止同一份 script 被重複初始化
    if (window.__deliveryFormInitialized) return;
    window.__deliveryFormInitialized = true;

    console.log("DOM fully loaded, initializing form...");

    const gasUrl = "https://script.google.com/macros/s/AKfycbzE7wP4x3S5k9BOpooS7VkiYMPYdPP2Wx9KDWaOnXZ5GLtWqE1OCHnBnjIy8jQQdWjK/exec";
    const orderForm = document.getElementById("orderForm");
    const totalCountText = document.getElementById("totalCountText");
    const eventDateInput = document.getElementById("eventDate");

    if (!orderForm || !totalCountText || !eventDateInput) return;

    let isSubmitting = false; // 防雙送出 / 防雙核對

    orderForm.reset();
    totalCountText.innerHTML = `
        <div class="total-summary">
            <div class="total-row">總枝數: <strong>0</strong> 枝。</div>
        </div>
    `;

    flatpickr("#eventDate", {
        dateFormat: "Y-m-d",
        minDate: "today",
        maxDate: new Date().fp_incr(180)
    });

    eventDateInput.addEventListener("change", function () {
        setTimeout(() => {
            if (!this.value) return;
            let eventDate = parseLocalDate(this.value);
            let today = new Date();
            today.setHours(0, 0, 0, 0);

            if (eventDate < today) {
                alert("請選擇今天到 180 天內的日期");
                this.value = "";
            }
        }, 300);
    });

    // 限制輸入純數字
    ["phoneNumber", "invoiceNumber"].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("input", function () {
                this.value = this.value.replace(/\D/g, "");
            });
        }
    });

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
        });
    }

    function calculateTotal() {
        let totalCount = 0;
        ["qtyDuoDuo", "qtyGrape", "qtyLychee", "qtyPassionFruit", "qtyStrawberry"].forEach(id => {
            totalCount += (parseInt(document.getElementById(id)?.value, 10) || 0);
        });

        let isValid = totalCount % 10 === 0 && totalCount > 0;
        let boxes = totalCount / 10;

        let displayText = `
            <div class="total-summary">
                <div class="total-row">總枝數: <strong>${totalCount}</strong> 枝，共 <strong>${boxes}</strong> 盒。</div>
        `;
        if (totalCount > 0 && !isValid) {
            displayText += `<div class="total-row error-text">總數量須為10的倍數喔😊</div>`;
        }
        displayText += `</div>`;

        totalCountText.innerHTML = displayText;
    }

    function getOrderDetails() {
        const flavors = [
            { name: "多多", id: "qtyDuoDuo" },
            { name: "葡萄", id: "qtyGrape" },
            { name: "荔枝", id: "qtyLychee" },
            { name: "百香", id: "qtyPassionFruit" },
            { name: "草莓", id: "qtyStrawberry" }
        ];

        let orderDetails = "";
        let totalCount = 0;

        flavors.forEach(f => {
            let qty = parseInt(document.getElementById(f.id)?.value, 10) || 0;
            if (qty > 0) {
                orderDetails += `${f.name}：${qty} 枝\n`;
                totalCount += qty;
            }
        });

        let shippingFee = totalCount >= 250 ? 0 : (totalCount >= 130 ? 290 : (totalCount >= 40 ? 225 : 160));
        let qStickPrice = totalCount * 14;

        return {
            orderDetails,
            totalCount,
            qStickPrice,
            shippingFee,
            totalPrice: qStickPrice + shippingFee
        };
    }

    function showThankYouModal() {
        const oldOverlay = document.getElementById("thankYouOverlay");
        const oldBox = document.getElementById("thankYouBox");
        if (oldOverlay) oldOverlay.remove();
        if (oldBox) oldBox.remove();

        const thankYouOverlay = document.createElement("div");
        thankYouOverlay.id = "thankYouOverlay";
        thankYouOverlay.style = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0,0,0,0.3);
            z-index: 999;
        `;

        const thankYouBox = document.createElement("div");
        thankYouBox.id = "thankYouBox";
        thankYouBox.style = `
            position: fixed;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            background: #fff;
            padding: 20px;
            border-radius: 10px;
            width: 90%;
            max-width: 400px;
            z-index: 1001;
            text-align: center;
        `;
        thankYouBox.innerHTML = `
            <p style="text-align:left; white-space:pre-line;">非常感謝您的填寫...</p>
            <button id="finalClose" style="background:#ff6600; color:white; border:none; padding:10px 20px; border-radius:5px; cursor:pointer;">確認</button>
        `;

        document.body.appendChild(thankYouOverlay);
        document.body.appendChild(thankYouBox);

        document.getElementById("finalClose").onclick = () => window.location.reload();
    }

    function removeConfirmModal() {
        const overlay = document.getElementById("confirmOverlay");
        const box = document.getElementById("confirmBox");
        if (overlay) overlay.remove();
        if (box) box.remove();
    }

    function fetchWithTimeout(url, options = {}, timeout = 12000) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);

        return fetch(url, {
            ...options,
            signal: controller.signal
        }).finally(() => clearTimeout(timer));
    }

    async function fetchCapacityCheck(eventDate, totalCount) {
        const res = await fetchWithTimeout(gasUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                eventDate,
                totalCount,
                orderType: "delivery"
            })
        }, 12000);

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        return await res.json();
    }

    orderForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        // 防止連點、Enter 重複送出、重複綁定導致的第二次 submit
        if (isSubmitting) return;
        isSubmitting = true;

        const { orderDetails, totalCount, totalPrice } = getOrderDetails();

        if (totalCount % 10 !== 0 || totalCount === 0) {
            alert("總數量須為10的倍數喔😊");
            isSubmitting = false;
            return;
        }

        const submitBtn =
            event.submitter ||
            orderForm.querySelector("button[type='submit']") ||
            orderForm.querySelector("input[type='submit']");

        if (!submitBtn) {
            alert("找不到送出按鈕，請重新整理頁面後再試。");
            isSubmitting = false;
            return;
        }

        const isInputBtn = submitBtn.tagName === "INPUT";
        const originalText = isInputBtn ? submitBtn.value : submitBtn.textContent;

        const resetBtn = () => {
            submitBtn.disabled = false;
            if (isInputBtn) submitBtn.value = originalText;
            else submitBtn.textContent = originalText;
            isSubmitting = false;
        };

        submitBtn.disabled = true;
        if (isInputBtn) submitBtn.value = "正在核對產能中...";
        else submitBtn.textContent = "正在核對產能中...";

        const eventDate = document.getElementById("eventDate").value;

        // 先移除舊的確認視窗，避免殘留造成「看起來像跳兩次」
        removeConfirmModal();

        try {
            const result = await fetchCapacityCheck(eventDate, totalCount);

            if (result.status === "error") {
                alert(result.message || "該日期產能不足，請改選其他日期。");
                resetBtn();
                return;
            }
        } catch (e) {
            console.error("capacity check error:", e);

            if (e.name === "AbortError") {
                alert("產能核對逾時，請稍後再試。");
            } else {
                alert("系統連線異常，請稍後再試。");
            }

            resetBtn();
            return;
        }

        const customerName = document.getElementById("customerName").value;
        const phoneNumber = document.getElementById("phoneNumber").value;
        const orderUnit = document.getElementById("orderUnit").value;
        const deliveryTime = document.getElementById("deliveryTime").value;
        const packingMethod = document.getElementById("packingMethod").value;

        let confirmationMessage =
            `請確認您的訂單資訊：\n\n` +
            `📌 姓名：${customerName}\n` +
            `📞 電話：${phoneNumber}\n` +
            `🏠 地址：${orderUnit}\n` +
            `📅 日期：${eventDate}\n` +
            `⏰ 時段：${deliveryTime}\n` +
            `📦 分裝：${packingMethod}\n\n` +
            `🛒 內容：\n${orderDetails}\n` +
            `🔢 總枝數：${totalCount}\n` +
            `💰 總金額：${totalPrice} 元`;

        const overlay = document.createElement("div");
        overlay.id = "confirmOverlay";
        overlay.style = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0,0,0,0.3);
            z-index: 999;
        `;

        const confirmBox = document.createElement("div");
        confirmBox.id = "confirmBox";
        confirmBox.style = `
            position: fixed;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            background: #fff;
            padding: 20px;
            border-radius: 10px;
            width: 90%;
            max-width: 500px;
            z-index: 1000;
        `;

        confirmBox.innerHTML = `
            <p style="white-space:pre-line;">${confirmationMessage}</p>
            <div style="display:flex; justify-content:space-between; margin-top:20px;">
                <button id="btnBack" type="button" style="background:#ccc; padding:10px 20px; border-radius:5px; cursor:pointer;">返回</button>
                <button id="btnSend" type="button" style="background:#ff6600; color:white; padding:10px 20px; border-radius:5px; cursor:pointer;">送出</button>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(confirmBox);

        document.getElementById("btnBack").onclick = () => {
            removeConfirmModal();
            resetBtn();
        };

        document.getElementById("btnSend").onclick = async () => {
            const btnSend = document.getElementById("btnSend");
            btnSend.disabled = true;
            btnSend.textContent = "送出中...";

            removeConfirmModal();

            const fd = new FormData();
            fd.append("entry.707832955", customerName);
            fd.append("entry.148881326", phoneNumber);
            fd.append("entry.1115123397", orderUnit);
            fd.append("entry.1853241713", eventDate);
            fd.append("entry.942601137", deliveryTime);
            fd.append("entry.1598893216", packingMethod);
            fd.append("entry.1820487257", document.getElementById("qtyDuoDuo").value || "0");
            fd.append("entry.2120858558", document.getElementById("qtyGrape").value || "0");
            fd.append("entry.1136794131", document.getElementById("qtyLychee").value || "0");
            fd.append("entry.1439982112", document.getElementById("qtyPassionFruit").value || "0");
            fd.append("entry.1813285675", document.getElementById("qtyStrawberry").value || "0");
            fd.append("entry.1400692215", totalCount);
            fd.append("entry.1440063522", totalPrice);

            try {
                await fetch(
                    "https://docs.google.com/forms/d/e/1FAIpQLScOiw6rFsnau8AxHKxr3zHgTofSyg6dIrky4Nhx7xoLqf8EWQ/formResponse",
                    {
                        method: "POST",
                        mode: "no-cors",
                        body: fd
                    }
                );

                orderForm.reset();
                calculateTotal();
                isSubmitting = false;
                showThankYouModal();
            } catch (e) {
                console.error("google form submit error:", e);
                alert("表單送出失敗，請稍後再試。");
                resetBtn();
            }
        };
    });

    function parseLocalDate(s) {
        const [y, m, d] = s.split("-");
        return new Date(y, m - 1, d);
    }
});
