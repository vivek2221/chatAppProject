import express from 'express'
import cors from 'cors'
import signUpRoute from './login routes/signUp.js'
import cookieParser from 'cookie-parser'
import loginInRoute from './login routes/login.js'
import friendsListRoute from './login routes/friendsListRoute.js'
import auth from './login routes/auth.js'
import pending from './login routes/pendingReq.js'
import connectionsTOMe from './login routes/connectionsTOMe.js'
import beginData from './login routes/BeginData.js'
import  rejectReq  from './login routes/rejectReq.js'
import {app,httpServer} from './websocket.js'
import path from 'path'
import 'dotenv/config'

app.set('trust proxy', 1)
app.use(cors({
    origin:process.env.uiUrl,
    credentials:true
}))
app.use(express.json())
app.use(cookieParser(process.env.SECRET))
app.use('/signUp',signUpRoute)
app.use('/login',loginInRoute)
app.use('/pendingReq',pending)
app.use('/connectionTOMe',connectionsTOMe)
app.use('/beginChat',beginData)
app.use('/allUsers',friendsListRoute)
app.use('/rejectReq',rejectReq)
app.use(express.static('./frontEndChatApp/dist'))
const currPath=path.resolve()
app.get("*all",async(req,res)=>{
    
     res.sendFile(path.resolve(currPath,"./frontEndChatApp/dist","index.html"))
})
httpServer.listen((process.env.Port || 10000),process.env.urlCommon,()=>{
    console.log(`server started on port ${process.env.serverPort}`)
})