import mongoose, {Schema} from "mongoose"
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2" //Mongoose to implement pagination on aggregation queries.

const commentSchema = new Schema(
    {
       content: {
           type: String,
           required: true
       },
       video: {
           type: Schema.Types.ObjectId,
           ref: "video"
       },
       owner: {
           type: Schema.Types.ObjectId,
           ref: "User"
       }

    },
    {
        timestamps: true
    }
)

commentSchema.plugin("mongooseAggregatePaginate")

export const Comment = mongoose.model("Comment", commentSchema)