import {WebSocketServer}  from 'ws'
import * as cookie from 'cookie' 
import signature from 'cookie-signature'
import { ModelNormal, ModelPendingReq, ModelSid,Modelconnections,ModelGoogle, ModelDataAll } from './mongooseShema.js'
import {createServer} from 'http'
import express from 'express'
import 'dotenv/config'


const allUsersData=async (valueMain)=>{
    const dataNormal=await ModelNormal.find().lean() 
        const dataGoogle=await ModelGoogle.find().lean()
        let data=[]
        dataNormal.forEach((ele)=>{
            data.push(ele.name)
        })
        dataGoogle.forEach((ele)=>{
            data.push(ele.name)
        })
        data=data.filter((ele)=>ele!=valueMain.mineName)
       return data
}
const allFriendsToMe=async(from,ws)=>{
    const allFriendsAsA=await Modelconnections.find({a:from})
        const allFriendsAsB=await Modelconnections.find({b:from})
        let data=allFriendsAsA.map((ele)=>{
            return ele.b
        })
        allFriendsAsB.forEach((ele)=>{
            data.push(ele.a)
        })
        ws.send(JSON.stringify({kindOf:'allFriendsToMe',data}))
}
const app=express();
const httpServer=createServer(app);
const server=new WebSocketServer({server:httpServer});
const storing={}
server.on('connection',async(ws,req)=>{
    const cookies=req.headers.cookie
    const real=cookie.parse(cookies || '')
    if(real.sid){
    const signed=real.sid
    const value =signed.slice(2)
    const reavalue=signature.unsign(value,process.env.SECRET)
    storing[reavalue]=ws
    ws.on('close', () => {
    delete storing[reavalue]
    })}
    ws.on('message',async(msg)=>{
        const valueMain=JSON.parse(msg.toString())
        const {kindOf}=valueMain
        try{
    if(kindOf==='allUsersData'){
        if(!real.sid){
         throw new Error("sid not found")
        }
        const data=await allUsersData(valueMain)
        ws.send(JSON.stringify({kindOf:'allUsersData',data}))
    }
    else if(kindOf==='allFriendsToMe'){
        if(!real.sid){
         throw new Error("sid not found")
        }
         allFriendsToMe(valueMain.from,ws)
    }
       else if(kindOf==='addReq'){
        if(!real.sid){
         throw new Error("sid not found")
        }
        const previousConnectionIfExists=await Modelconnections.findOne({$or:[{a:valueMain.to,b:valueMain.from},{a:valueMain.from,b:valueMain.to}]})
        if(previousConnectionIfExists){
            ws.send(JSON.stringify({mess:'already a Friend'}))
        }
        else{
        const alreadySendReq=await ModelPendingReq.findOne({from:valueMain.from,to:valueMain.to})
        if(alreadySendReq){
           ws.send(JSON.stringify({mess:"already send the request"}))
        }
        else{
        await ModelPendingReq.create({from:valueMain.from,to:valueMain.to})
        const findforWhom=await ModelNormal.findOne({name:valueMain.to}) || await ModelGoogle.findOne({name:valueMain.to})
        if(findforWhom){
            const ssidOfthatUser=await ModelSid.findOne({someId:findforWhom.id})
            if(ssidOfthatUser){
                const CurrSocketssid=storing[ssidOfthatUser.id.toString()]
                if(CurrSocketssid!==undefined){
                    let allPendingsForOtherOne=await ModelPendingReq.find({to:valueMain.to})
                    allPendingsForOtherOne = allPendingsForOtherOne.map((ele)=>{
                        return ele.from})
                    CurrSocketssid.send(JSON.stringify({kindOf:"pendingsToMe",data:allPendingsForOtherOne}))
                }
            }
        }}}
        }
        else if(kindOf==='ack'){
            if(!real.sid){
         throw new Error("sid not found")
        }
            allFriendsToMe(valueMain.to,ws)
            const checkExists=await ModelPendingReq.findOne({from:valueMain.from,to:valueMain.to})
            if(checkExists){
                const aId=await ModelNormal.findOne({name:valueMain.from}) || await ModelGoogle.findOne({name:valueMain.from})
                 const bId=await ModelNormal.findOne({name:valueMain.to}) || await ModelGoogle.findOne({name:valueMain.to})
                 const  ssidOtherUser = await ModelSid.findOne({someId:aId.id})
                if(ssidOtherUser){
                    let socketOfOther=storing[ssidOtherUser.id]
                    allFriendsToMe(valueMain.from,socketOfOther)
                }
                await Modelconnections.create({a:valueMain.from,b:valueMain.to,aId:aId,bId:bId})
                await ModelPendingReq.deleteMany({from:valueMain.to,to:valueMain.from})
                await ModelPendingReq.deleteMany({from:valueMain.from,to:valueMain.to})
                
            }
            
        }
        else if(kindOf==='chat'){
            if(!real.sid){
         throw new Error("sid not found")
        }
        try{
                const toIdSid= await ModelSid.findOne({name:valueMain.to})
                if(storing[toIdSid.id]){
                storing[toIdSid.id].send(JSON.stringify({kindOf:'chatMessage',msg:valueMain.input,from:valueMain.from,timeAt:opsTime.timeAT}))
                }
        }
            catch(err){
                console.log("err",err)
            }
            const idFinding=await Modelconnections.findOne({a:valueMain.from,b:valueMain.to}) || await Modelconnections.findOne({a:valueMain.to,b:valueMain.from})
            if(idFinding){
            const opsTime=await ModelDataAll.insertOne({searchId:idFinding.id,msg:valueMain.input,from:valueMain.from,to:valueMain.to})
            }
        }
        else if(kindOf==='pendingReqsForMe'){
            if(!real.sid){
         throw new Error("sid not found")
        }
           let allPendingsForMe=await ModelPendingReq.find({to:valueMain.from})
           allPendingsForMe= allPendingsForMe.map((ele)=>{
           return ele.from})
           ws.send(JSON.stringify({kindOf:"pendingsToMe",data:allPendingsForMe}))
        }
        else if(kindOf==='newLogin'){
            for(let [key,value] of Object.entries(storing)){
               if(value===ws){
                continue
               }
               let name=await ModelSid.findOne({someId:key})
               let valueMain={mineName:name}
               let data=await allUsersData(valueMain)
               storing[key].send(JSON.stringify({kindOf:'allUsersData',data}))
            }
        }
        }catch(err){
          ws.send(JSON.stringify({kindOf:'reLogin'}))
          }
     })

})
export {
    app,
    httpServer,
    server
}