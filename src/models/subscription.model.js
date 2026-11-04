import mongoose, {Schema} from "mongoose"

const subscriptionSchema = new Schema({
     subscriber: {
        type: Schema.Types.ObjectId,
        ref: "User"
     },
     channel: {  // we can directly add channel name as Id internally mongodb handle it.
        type: Schema.Types.ObjectId,
        ref: "User"
     }
}, {timestamps: true})

export const Subscription = mongoose.model("Subscription", subscriptionSchema)