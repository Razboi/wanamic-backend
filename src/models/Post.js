const
	mongoose = require( "mongoose" ),
	Schema = mongoose.Schema,

	PostSchema = mongoose.Schema({
		author: { type: String, required: true },
		content: { type: String },
		media: { type: Boolean, default: false },
		mediaContent: {
			title: { type: String },
			image: { type: String }
		}
	}, { timestamps: true }),


	Post = mongoose.model( "Post", PostSchema );

module.exports = Post;
