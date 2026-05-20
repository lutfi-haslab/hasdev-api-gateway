import { Hono } from "hono";
import { Environment } from "../../bindings";
import {
    CloudflareVectorizeStore,
    CloudflareWorkersAIEmbeddings,
} from "@langchain/cloudflare";
import { describeRoute } from "hono-openapi";


const aiRoutes = new Hono<Environment>();

aiRoutes.post('/test/vector',
    describeRoute({
        description: 'Add Vector',
        tags: ['AI'],
    }), async (c) => {
        const embeddings = new CloudflareWorkersAIEmbeddings({
            binding: c.env.AI,
            model: "@cf/baai/bge-base-en-v1.5",
        });
        const store = new CloudflareVectorizeStore(embeddings, {
            index: c.env.VECTORIZE,
        });
        const results = await store.similaritySearch("joke scientists", 1);
        return c.json(results);
    })

aiRoutes.post('/test/vector/load',
    describeRoute({
        description: 'Load Vector',
        tags: ['AI'],
    }), async (c) => {
        const embeddings = new CloudflareWorkersAIEmbeddings({
            binding: c.env.AI,
            model: "@cf/baai/bge-base-en-v1.5",
        });
        const store = new CloudflareVectorizeStore(embeddings, {
            index: c.env.VECTORIZE,
        });

        const data = await store.addDocuments(
            [
                {
                    pageContent: "I told my wife she was drawing her eyebrows too high. She looked surprised.",
                    metadata: {},
                },
                {
                    pageContent: "Why don't scientists trust atoms? Because they make up everything.",
                    metadata: {},
                },
                {
                    pageContent: "I'm reading a book about anti-gravity. It's impossible to put down.",
                    metadata: {},
                },
            ],
            { ids: ["id4", "id5", "id6"] }
        );

        if (!data) {
            return c.json({ error: 'Failed to add documents' }, 500);
        }
        return c.json({ data, msg: 'Documents added successfully' });
    })


export default aiRoutes