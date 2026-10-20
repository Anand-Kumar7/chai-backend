import express from "express" 
import cors from "cors"
import cookieParser from "cookie-parser";

app.use(cors({
    origin : process.env.CORS_ORIGIN,
    credentials:true
}))

// this settings for the accepting document
app.use(express.json({limit:"16kb"})) //for accepting json data
app.use(express.urlencoded({extended:true, limit:"16kb"})) // for accepting url data because data structure different(+, %, etc)
app.use(express.static("public")) // static file a     bove we make that public folder
app.use(cookieParser())

const app = express();


export{app}