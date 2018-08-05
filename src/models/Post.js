const
	mongoose = require( "mongoose" ),
	Schema = mongoose.Schema,

	PostSchema = mongoose.Schema({
		author: { type: Schema.Types.ObjectId, ref: "User", required: true },
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
			spoiler: { type: Boolean, default: false },
			spoilerDescription: { type: String }
		},
		privacyRange: { type: Number, default: 1 },
		mediaContent: {
			title: { type: String },
			artist: { type: String },
			image: { type: String },
			url: { type: String }
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

PostSchema.post( "remove", async( post, next ) => {
	try {
		await mongoose.model( "Comment" ).remove({
			_id: { $in: post.comments }
		}).exec();
		next();
	} catch ( err ) {
		return next( err );
	}
});

module.exports = Post;
