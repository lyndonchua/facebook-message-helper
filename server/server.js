import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
const app = express();
app.use(cors());
app.use(express.json({limit:'1mb'}));
const client = new OpenAI({apiKey: process.env.OPENAI_API_KEY});
app.post('/api/suggest', async (req,res)=>{
  try{
    const {messages,tone,language}=req.body;
    if(!messages) return res.status(400).send('Missing messages');
    const prompt = `You are helping the user reply to Facebook/Messenger messages.\n\nTasks:\n1. Translate/summarise the other person's meaning in English.\n2. Suggest 3 replies.\n3. Replies should be: ${tone}.\n4. Reply language: ${language}.\n5. Keep replies natural, not robotic.\n\nMessages:\n${messages}\n\nReturn strict JSON: {"translation":"...","replies":["...","...","..."]}`;
    const completion = await client.chat.completions.create({model:'gpt-4o-mini',messages:[{role:'user',content:prompt}],temperature:0.7,response_format:{type:'json_object'}});
    res.json(JSON.parse(completion.choices[0].message.content));
  }catch(err){res.status(500).send(err.message||'Server error');}
});
app.listen(process.env.PORT || 8787,()=>console.log('Facebook Message Helper API running'));
