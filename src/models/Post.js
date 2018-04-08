const
	mongoose = require( "mongoose" ),
	Schema = mongoose.Schema,

	PostSchema = mongoose.Schema({
		author: { type: String, required: true },
		content: { type: String, required: true },
	}, { timestamps: true }),


	Post = mongoose.model( "Post", PostSchema );

module.exports = Post;
