const
	mongoose = require( "mongoose" ),
	Schema = mongoose.Schema,

	CommentSchema = mongoose.Schema({
		author: { type: Schema.Types.ObjectId, ref: "User", required: true },
		content: { type: String, required: true },
		post: { type: Schema.Types.ObjectId, ref: "Post" }
	}, { timestamps: true }),


	Comment = mongoose.model( "Comment", CommentSchema );

module.exports = Comment;
