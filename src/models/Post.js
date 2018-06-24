const
	mongoose = require( "mongoose" ),
	Schema = mongoose.Schema,

	PostSchema = mongoose.Schema({
		author: { type: String, required: true },
		authorFullname: { type: String, required: true },
		authorImg: { type: String },
		content: { type: String },
		media: { type: Boolean, default: false },
		link: { type: Boolean, default: false },
		picture: { type: Boolean, default: false },
		likedBy: [ { type: String } ],
		sharedBy: [ { type: String } ],
		sharedPost: { type: Schema.Types.ObjectId, ref: "Post" },
		comments: [ { type: Schema.Types.ObjectId, ref: "Comment" } ],
		hashtags: [ { type: String } ],
		alerts: {
			nsfw: { type: Boolean, default: false },
			spoiler: { type: Boolean, default: false }
		},
		privacyRange: { type: Number, default: 1 },
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
