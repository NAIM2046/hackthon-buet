import express, { Request, Response } from 'express';
import cors from 'cors';
import { prisma } from './lib/prisma';


// সরাসরি এখানেই Prisma কানেক্ট করছি (lib ফোল্ডার লাগবে না)

const app = express();

app.use(cors());
app.use(express.json());

// --- GREMLIN (Delay Simulation) ---
const gremlinLatency = async () => {
    if (Math.random() < 0.5) {
        const delay = Math.floor(Math.random() * 5000);
        console.log(`😈 Gremlin Attack! Delaying: ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
    }
};

app.post('/update-inventory', async (req: Request, res: Response): Promise<any> => {
    // 1. Gremlin চালু
    await gremlinLatency();

    const { productId, quantity, orderId } = req.body;
    console.log(`📦 Inventory Request for: ${orderId}`);

    try {
        // --- IDEMPOTENCY CHECK ---
        const existing = await prisma.idempotencyLog.findUnique({
            where: { orderId: orderId } 
        });

        if (existing) {
            console.log(`♻️ Already Processed: ${orderId}`);
            return res.json({ message: "Success (Cached)", remainingStock: "CHECK_DB" });
        }

        // --- TRANSACTION ---
        await prisma.$transaction(async (tx) => {
            // ১. স্টক চেক
            const product = await tx.inventory.findUnique({ where: { productId } });
            
            // যদি প্রোডাক্ট না থাকে বা স্টক কম থাকে
            if (!product || product.quantity < quantity) {
                throw new Error("STOCK_LOW");
            }

            // ২. স্টক কমানো
            await tx.inventory.update({
                where: { productId },
                data: { quantity: { decrement: quantity } }
            });

            // ৩. লগ তৈরি
            await tx.idempotencyLog.create({
                data: { orderId: orderId }
            });
        });

        // --- SIMULATED CRASH ---
        if (Math.random() < 0.3) {
            console.log(`👻 CRASH after commit! (${orderId})`);
            return res.status(500).json({ error: "Simulated Crash" });
        }

        console.log(`✅ Stock updated for ${orderId}`);
        res.json({ message: "Inventory Updated" });

    } catch (e: any) {
        if (e.message === "STOCK_LOW") {
            console.log(`❌ Stock Low for ${productId}`);
            return res.status(400).json({ error: "Insufficient Stock" });
        }
        console.error("Inventory Error:", e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
// --- SEED ENDPOINT (এটা শুধু প্রোডাক্ট অ্যাড করার জন্য) ---
app.get('/seed-product', async (req, res) => {
    try {
        await prisma.inventory.create({
            data: {
                productId: "item-125", // ফ্রন্টএন্ডের সাথে মিল থাকতে হবে
                quantity: 100
            }
        });
        res.json({ message: "Product created!" });
    } catch (e) {
        res.json({ error: "Product already exists or Error" });
    }
});

app.get('/health', async (req, res) => {
    try {
        // ডাটাবেস চেক: একটা ডামি কুয়েরি চালানো
        await prisma.inventory.findFirst();
        res.status(200).json({ status: "UP", database: "Connected" });
    } catch (e) {
        res.status(500).json({ status: "DOWN", database: "Disconnected" });
    }
});

app.listen(4000, () => console.log("Inventory Service running on 4000"));