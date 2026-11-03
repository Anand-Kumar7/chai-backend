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
        $unset: {
          refreshToken: 1
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
    .json(new ApiResponse(200, {}, "User logged Out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        new ApiResponse(401, "Unauthorized request")
    }

    try {
      const decodedToken = jwtverify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
  
      const user = await User.findById(decodedToken?._id)
  
      if(!user){
        throw new ApiError(401, "Invalid refresh token")
      }
  
      if(incomingRefreshToken !== user?.refreshToken){
        throw new ApiResponse(401, "Refresh token is expired or used")
      }
  
      const options = {
          httpOnly: true,
          secure: true
      }
      const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)
  
      return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
         200,
         {accessToken, refreshToken: newRefreshToken}
         ,"access token refreshed"
      )
    } catch (error) {
       new ApiError(401, error?.message || "Invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
      const {oldPassword, newPassword} = req.body
      
      const user = await User.findById(req.user?._id);

      const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

      if(!isPasswordCorrect){
        new ApiError(400, "Invalid old password")
      }

      user.password = newPassword
      await user.save({validateBeforeSave: true})

      return res
      .status(200)
      .json(
        new ApiResponse(200, {}, "Password change successfully" )
      )
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
    .status(200)
    .json(
        new ApiResponse(
        200,
        req.user,
        "User fetched successfully"
      )
    )  
})
 
const updateAccountDetails = asyncHandler(async (req, res) => {
     const {fullName, email} = req.body
     
     if(!fullName || !email){
        throw new ApiError(400, "All fields are required")
     }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set: {
             fullName,
             email: email
         }
      },
      {new: true}
     ).select("-password")

     return res
     .status(200)
     .json(new ApiResponse(200, user, "Account detail updated successfully"))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
       throw new ApiError(400, "Avatar file is missing")
    }
    
    const avatar= await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
       throw new ApiError(400, "Error while uploading avatar on cloudinary")
    }
    
    const oldAvatarUrl = req.user?.avatar

    const user = User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
            avatar: avatar.url
         } 
      },
      {new: true}
    ).select("-password")
    
    if(oldAvatarUrl){
      await deleteFromCloudinary(oldAvatarUrl)
    }

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar image updated successfully"))

})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
       throw new ApiError(400, "coverImage file is missing")
    }
    
    const coverImage= await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
       throw new ApiError(400, "Error while uploading coverImage on cloudinary")
    }
    
    const oldCoverImageUrl = req.user?.coverImage;

    const user = User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
            coverImage: coverImage.url
         } 
      },
      {new: true}
    ).select("-password")

    if (oldCoverImageUrl) {
        await deleteFromCloudinary(oldCoverImageUrl);
    }

    return res
    .status(200)
    .json(new ApiResponse(200, user, "coverImage image updated successfully"))

})

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage
}