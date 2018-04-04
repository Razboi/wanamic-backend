const
	mongoose = require( "mongoose" ),

	PostSchema = mongoose.Schema({
		authorId: { type: String, required: true },
		authorUsername: { type: String, required: true },
		content: { type: String, required: true },
	}, { timestamps: true }),


	Post = mongoose.model( "Post", PostSchema );

module.exports = Post;
