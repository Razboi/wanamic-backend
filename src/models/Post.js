const
	mongoose = require( "mongoose" ),
	Schema = mongoose.Schema,

	PostSchema = mongoose.Schema({
		author: { type: String, required: true },
		content: { type: String },
		media: { type: Boolean, default: false },
		link: { type: Boolean, default: false },
		mediaContent: {
			title: { type: String },
			artist: { type: String },
			image: { type: String }
		},
		linkContent: {
			url: { type: String },
			embeddedUrl: { type: String },
			hostname: { type: String },
			title: { type: String },
			description: { type: String },
			image: { type: String }
		}
	}, { timestamps: true }),


	Post = mongoose.model( "Post", PostSchema );

module.exports = Post;
