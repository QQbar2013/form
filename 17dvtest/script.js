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
    console.log("DOM fully loaded, initializing form...");

    // 🎯 強制關閉瀏覽器內建的氣泡提示，全面啟用我們的自訂紅框功能！
    const orderForm = document.getElementById("orderForm");
    if (orderForm) {
        orderForm.setAttribute("novalidate", "true");
    }

    // 產能核對 API 網址
    const gasUrl = "https://script.google.com/macros/s/AKfycbzE7wP4x3S5k9BOpooS7VkiYMPYdPP2Wx9KDWaOnXZ5GLtWqE1OCHnBnjIy8jQQdWjK/exec";

    // 確認表單元素存在
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
            this.style.border = ""; // 輸入時自動解掉紅框
            console.log("Phone number input:", this.value);
        });
    }

    // 限制統一編號只能輸入數字
    const invoiceNumberInput = document.getElementById("invoiceNumber");
    if (invoiceNumberInput) {
        invoiceNumberInput.addEventListener("input", function () {
            this.value = this.value.replace(/\D/g, "");
            console.log("Invoice number input:", this.value);
        });
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
        });
    }

    // 🔹 計算總計
    function calculateTotal() {
        let totalCount = 0;
        const flavorIds = [
            "qtyDuoDuo", "qtyGrape", "qtyLychee", "qtyPassionFruit", "qtyStrawberry",
            "qtyApple", "qtyPineapple", "qtyOrange", "qtyPeach", "qtyMango"
        ];

        flavorIds.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                let qty = parseInt(input.value) || 0;
                totalCount += qty;
            }
        });

        let isValid = totalCount % 10 === 0 && totalCount > 0;
        let displayText = `<div class="total-summary" id="totalSummaryBox">`;
        const boxes = totalCount / 10;
        const boxesText = Number.isInteger(boxes) ? boxes : boxes.toFixed(1);
        displayText += `<div class="total-row">總枝數: <strong>${totalCount}</strong> 枝，共 <strong>${boxesText}</strong> 盒。</div>`;

        if (totalCount > 0) {
            let qStickPrice = totalCount * 17; // 單價 17 元
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
    }

    // 🎯 取得訂購內容（資料源頭已手動補入全形空格對齊）
    function getOrderDetails() {
        const flavorData = [
            { name: "多　多", id: "qtyDuoDuo" },
            { name: "葡　萄", id: "qtyGrape" },
            { name: "荔　枝", id: "qtyLychee" },
            { name: "百香果", id: "qtyPassionFruit" },
            { name: "草　莓", id: "qtyStrawberry" },
            { name: "蘋　果", id: "qtyApple" },
            { name: "鳳　梨", id: "qtyPineapple" },
            { name: "柳　橙", id: "qtyOrange" },
            { name: "水蜜桃", id: "qtyPeach" },
            { name: "芒　果", id: "qtyMango" }
        ];
        let orderDetails = "";
        let totalCount = 0;
        let qStickPrice = 0;

        flavorData.forEach(flavor => {
            let quantity = parseInt(document.getElementById(flavor.id)?.value) || 0;
            if (quantity > 0) {
                // 🚀 名字在陣列裡手動對齊好了，這裡直接串接「口味：」就完美直線排列！
                orderDetails += `    ▫️ ${flavor.name}口味：${quantity} 枝\n`;
                totalCount += quantity;
                qStickPrice += quantity * 17;
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
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #fff; padding: 20px; border-radius: 10px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.2); width: 90%; max-width: 400px;
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

        const submitBtnOnPage = event.submitter || orderForm.querySelector("button[type='submit']");
        const originalBtnText = submitBtnOnPage.textContent || submitBtnOnPage.value;

        const resetSubmitBtn = () => {
            submitBtnOnPage.disabled = false;
            if (submitBtnOnPage.tagName === "BUTTON") {
                submitBtnOnPage.textContent = originalBtnText;
            } else {
                submitBtnOnPage.value = originalBtnText;
            }
        };

        // 🎯 1. 必填欄位紅框驗證
        let requiredFields = [
            { id: "customerName" },
            { id: "phoneNumber" },
            { id: "orderUnit" },
            { id: "eventDate" },
            { id: "deliveryTime" },
            { id: "packingMethod" }
        ];

        let hasMissingField = false;

        requiredFields.forEach(field => {
            let input = document.getElementById(field.id);
            if (!input || !input.value.trim()) {
                hasMissingField = true;
                if (input) input.style.border = "2px solid red";
            } else {
                if (input) input.style.border = "";
            }
        });

        // 🎯 2. 如果基本必填欄位有缺：亮紅框，並且立刻滑順捲動回最頂端
        if (hasMissingField) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            resetSubmitBtn();
            return;
        }

        // 🎯 3. 數量與 10 的倍數驗證
        const { orderDetails, totalCount, qStickPrice, shippingFee, totalPrice } = getOrderDetails();

        // 🎯 4. 如果必填都填了，但純粹是數量不對：精準攔截拒絕送出，但是「完全不往上捲動」！
        if (totalCount % 10 !== 0 || totalCount === 0) {
            resetSubmitBtn();
            return;
        }

        // 5. 到貨日期合法性安全防線
        const eventDate = document.getElementById("eventDate").value.trim();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDate = new Date(eventDate);
        if (selectedDate < today) {
            document.getElementById("eventDate").style.border = "2px solid red";
            window.scrollTo({ top: 0, behavior: 'smooth' });
            resetSubmitBtn();
            return;
        }

        // 6. 開始產能核對
        submitBtnOnPage.disabled = true;
        if (submitBtnOnPage.tagName === "BUTTON") {
            submitBtnOnPage.textContent = "正在核對產能中...";
        } else {
            submitBtnOnPage.value = "正在核對產能中...";
        }

        await new Promise(resolve => setTimeout(resolve, 50));

        try {
            const res = await fetch(gasUrl, {
                method: "POST",
                body: JSON.stringify({
                    eventDate,
                    totalCount,
                    orderType: "delivery",
                    flavors: getFlavorMap()
                })
            });
            const result = await res.json();

            if (result.status === "error") {
                alert(result.message);
                resetSubmitBtn();
                return;
            }
        } catch (e) {
            console.error("Capacity check failed:", e);
            alert("產能核對系統連線異常，請檢查網路或稍後再試。");
            resetSubmitBtn();
            return;
        }

        resetSubmitBtn();

        // 7. 生成確認視窗
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

            const formData = new URLSearchParams();
            formData.append("entry.2060121763", customerName);
            formData.append("entry.1920937747", phoneNumber);
            formData.append("entry.1416224354", orderUnit);
            formData.append("entry.1954611417", invoiceTitle);
            formData.append("entry.975658504", invoiceNumber);
            formData.append("entry.1708233500", eventDate);
            formData.append("entry.1237214910", deliveryTime);
            formData.append("entry.901872460", packingMethod);

            // 10 種口味資料傳送
            formData.append("entry.1278800672", document.getElementById("qtyDuoDuo").value || "0");
            formData.append("entry.102995102", document.getElementById("qtyGrape").value || "0");
            formData.append("entry.327904499", document.getElementById("qtyLychee").value || "0");
            formData.append("entry.1506309778", document.getElementById("qtyPassionFruit").value || "0");
            formData.append("entry.165934484", document.getElementById("qtyStrawberry").value || "0");
            formData.append("entry.924057125", document.getElementById("qtyApple").value || "0");
            formData.append("entry.1659487221", document.getElementById("qtyPineapple").value || "0");
            formData.append("entry.1824798891", document.getElementById("qtyOrange").value || "0");
            formData.append("entry.1018990036", document.getElementById("qtyPeach").value || "0");
            formData.append("entry.2051550962", document.getElementById("qtyMango").value || "0");

            // 總額與運費傳送
            formData.append("entry.2007999021", totalCount.toString());
            formData.append("entry.740186001", qStickPrice.toString());
            formData.append("entry.2008804380", shippingFee.toString());
            formData.append("entry.264561249", totalPrice.toString());

            fetch("https://docs.google.com/forms/d/e/1FAIpQLSfPPhdVADqqCp_LSx5tlI_QOLrlRDfNJpKLjKId9WFkk3zU2Q/formResponse", {
                method: "POST",
                mode: "no-cors",
                body: formData
            });

            orderForm.reset();
            calculateTotal();

            // 抓取網址後綴並跳轉
            const urlParams = new URLSearchParams(window.location.search);
            const source = urlParams.get('v');

            const lineLinks = {
                "lH4m8Q5v": "https://qqbar2013.github.io/form/success/dvlH4m8Q5v.html",
                "sL9x7P2k": "https://qqbar2013.github.io/form/success/dvsL9x7P2k.html",
                "mL3w6R9j": "https://qqbar2013.github.io/form/success/dvmL3w6R9j.html"
            };

            if (source && lineLinks[source]) {
                window.location.href = lineLinks[source];
            } else {
                window.requestAnimationFrame(() => showThankYouModal());
            }
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
