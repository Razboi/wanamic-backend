const
	mongoose = require( "mongoose" ),
	Schema = mongoose.Schema,

	CommentSchema = mongoose.Schema({
		author: { type: String, required: true },
		authorFullname: { type: String, required: true },
		authorImg: { type: String },
		content: { type: String, required: true },
		post: { type: Schema.Types.ObjectId, ref: "Post" }
	}, { timestamps: true }),


	Comment = mongoose.model( "Comment", CommentSchema );

module.exports = Comment;
