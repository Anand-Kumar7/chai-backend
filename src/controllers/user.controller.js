import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const registerUser = asyncHandler(async(req, res) => {
    // get user detail from frontend _/
    // check Validation - not empty  _/
    // check if user already exist - username, email _/
    // check for image and avatar _/
    // upload them to cloudinary , avatar _/
    // create user object and put it in db _/
    // remove password and refresh token from response _/
    // check for user creation _/
    // return res  _/

     const {fullName, email, username, password} = req.body

     //console.dir("username:",username);

     if([fullName, email, username, password].some((field)=>
       field?.trim() === ""
      )){
        throw new ApiError(400, "All field are required")
     }

     const existedUser = User.findOne({
       $or: [{username}, {email}]
     })     
     
     if(existedUser){
        throw new ApiError(409, "User with username or email already exists")
     }

     const avatarLocalPath = req.files?.avatar[0]?.path
     const coverImageLocalPath = req.files?.coverImage[0]?.path
     
     if(!avatarLocalPath){
      throw new ApiError(400, "Avatar file is required")
     }

     const avatar = await uploadOnCloudinary(avatarLocalPath)
     const coverImage = await uploadOnCloudinary(coverImageLocalPath)
     
     if(!avatar){
      throw new ApiError(400, "Avatar file is required")
     }
     
     const user = await User.create({
         fullName,
         avatar: avatar.url,
         coverImage: coverImage?.url || "",
         email,
         password,
         username: username.toLowerCase()  
     })
    
     const createUser = await User.findById(user._id).select("-password -refreshToken")

     if(!createUser){
      throw new ApiError(500, "Something went wrong while registering the user")
     }

     return res.status(200).json(
       new ApiResponse(200, createUser, "User register successfully")
     )
})

export {registerUser}