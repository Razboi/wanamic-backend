const
	mongoose = require( "mongoose" ),
	Schema = mongoose.Schema,

	CommentSchema = mongoose.Schema({
		author: { type: Schema.Types.ObjectId, ref: "User", required: true },
		content: { type: String, required: true },
		post: { type: Schema.Types.ObjectId, ref: "Post" }
	}, { timestamps: true }),

	Comment = mongoose.model( "Comment", CommentSchema );

CommentSchema.post( "remove", async( comment, next ) => {
	try {
		await mongoose.model( "Post" ).update(
			{ _id: comment.post },
			{ $pull: { "comments": comment._id } }
		).exec();
		next();
	} catch ( err ) {
		return next( err );
	}
});

module.exports = Comment;
