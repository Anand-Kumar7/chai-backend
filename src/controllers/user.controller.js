import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const generateAccessAndRefreshToken = async(userId) => {
    try {
         const user = await User.findById(userId)
         const accessToken = user.generateAccessToken()
         const refreshToken = user.generateRefreshToken() 

         user.refreshToken = refreshToken
         await user.save({ validateBeforeSave: false})
         
         return {accessToken, refreshToken}
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token")
    }
}

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

     const existedUser = await User.findOne({
       $or: [{username}, {email}]
     })     
     
     if(existedUser){
        throw new ApiError(409, "User with username or email already exists")
     }

     //const avatarLocalPath = req.files?.avatar[0]?.path
     const avatarLocalPath = req.files?.avatar?.[0]?.path
     const coverImageLocalPath = req.files?.coverImage?.[0]?.path //?.[0] it check whether array exist or not 
     
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

const loginUser = asyncHandler(async(req, res) => {
    // req body -> data _/
    // username, email _/
    // find the user _/
    // password check _/
    // access token and refresh token _/
    // send cookie _/

    const {username, email, password} = req.body;
  
    if(!(username||email)){
      throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
      $or: [{username}, {email}]
    })

    if(!user){
     throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    
    if(!isPasswordValid){
       throw new ApiError(401, "Invalid user credentials")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true, // it only allow to modify with server not by frontend
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
          200, 
          {
            user: loggedInUser, accessToken, refreshToken
          },
          "User loggedIn successfully"
        )
    )
    
})

const logoutUser = asyncHandler(async(req, res) => {
   await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          refreshToken: undefined
        }        
      },
      {
        new: true // Optional return the updated document instead of the old document
      }
   )

    const options = {
        httpOnly: true, // it only allow to modify with server not by frontend
        secure: true
    } 

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, "User logged Out"))
})

export {
  registerUser,
  loginUser,
  logoutUser
}