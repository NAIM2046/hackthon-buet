// এই স্ক্রিপ্ট চালানোর জন্য টার্মিনালে লিখুন: node test-automation.js

// ১. আপনার টার্গেট URL সেট করুন (Render বা Localhost)
 const TARGET_URL = "https://valerix-order.onrender.com/create-order"; // লোকাল টেস্টিং
//const TARGET_URL = "https://valerix-order.onrender.com/create-order"; // ক্লাউড টেস্টিং (আপনার URL বসান)

const TOTAL_REQUESTS = 20; // একসাথে ২০ জন ইউজার

async function sendOrder(i) {
    const orderId = `AUTO-TEST-${Date.now()}-${i}`;
    const startTime = Date.now();

    try {
        const response = await fetch(TARGET_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                orderId: orderId,
                userId: `bot_user_${i}`,
                productId: "item-123",
                quantity: 1,
                price: 100
            })
        });

        const data = await response.json();
        const duration = Date.now() - startTime;

        if (response.ok) {
            console.log(`✅ Req #${i}: Success! ID: ${data.orderId} (${duration}ms)`);
            return { status: "success", time: duration };
        } else {
            console.log(`❌ Req #${i}: Failed! ${data.error} (${duration}ms)`);
            return { status: "failed", time: duration };
        }

    } catch (error) {
        const duration = Date.now() - startTime;
        console.log(`⚠️ Req #${i}: Network Error/Timeout (${duration}ms)`);
        return { status: "error", time: duration };
    }
}

async function runLoadTest() {
    console.log(`🚀 Starting Load Test on: ${TARGET_URL}`);
    console.log(`📦 Sending ${TOTAL_REQUESTS} concurrent requests...\n`);

    // সব রিকোয়েস্ট একসাথে পাঠানো হচ্ছে (Parallel Execution)
    const promises = [];
    for (let i = 1; i <= TOTAL_REQUESTS; i++) {
        promises.push(sendOrder(i));
    }

    // সবগুলোর রেজাল্টের জন্য অপেক্ষা করা
    const results = await Promise.all(promises);

    // --- SUMMARY REPORT ---
    console.log("\n📊 --- TEST SUMMARY ---");
    const success = results.filter(r => r.status === "success").length;
    const failed = results.filter(r => r.status !== "success").length;
    
    console.log(`✅ Successful Orders: ${success}`);
    console.log(`❌ Failed/Timed out:  ${failed}`);
    console.log("-----------------------");
    
    if (success > 0 && failed > 0) {
        console.log("🏆 Result: PASS (System handled failures gracefully)");
    } else if (failed === 0) {
        console.log("🏆 Result: PASS (Perfect Run!)");
    } else {
        console.log("⚠️ Result: WARNING (Too many failures, check logs)");
    }
}

runLoadTest();