const
	mongoose = require( "mongoose" ),
	Schema = mongoose.Schema,

	CommentSchema = mongoose.Schema({
		author: { type: String, required: true },
		content: { type: String }
	}, { timestamps: true }),


	Comment = mongoose.model( "Comment", CommentSchema );

module.exports = Comment;
