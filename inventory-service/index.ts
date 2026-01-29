import express, { Request, Response } from 'express';
import cors from 'cors';
import { prisma } from './lib/prisma';




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
   
    await gremlinLatency();

    const { productId, quantity, orderId } = req.body;
    console.log(`📦 Inventory Request for: ${orderId}`);

    try {
       
        const existing = await prisma.idempotencyLog.findUnique({
            where: { orderId: orderId } 
        });

        if (existing) {
            console.log(`♻️ Already Processed: ${orderId}`);
            return res.json({ message: "Success (Cached)", remainingStock: "CHECK_DB" });
        }

        // --- TRANSACTION ---
        await prisma.$transaction(async (tx) => {
          
            const product = await tx.inventory.findUnique({ where: { productId } });
            
           
            if (!product || product.quantity < quantity) {
                throw new Error("STOCK_LOW");
            }

           
            await tx.inventory.update({
                where: { productId },
                data: { quantity: { decrement: quantity } }
            });

          
            await tx.idempotencyLog.create({
                data: { orderId: orderId }
            });
        });

      
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

app.get('/seed-product', async (req, res) => {
    try {
        await prisma.inventory.create({
            data: {
                productId: "item-125", 
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
        
        await prisma.inventory.findFirst();
        res.status(200).json({ status: "UP", database: "Connected" });
    } catch (e) {
        res.status(500).json({ status: "DOWN", database: "Disconnected" });
    }
});

app.listen(4000, () => console.log("Inventory Service running on 4000"));