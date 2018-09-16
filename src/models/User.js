const
	mongoose = require( "mongoose" ),
	bcrypt = require( "bcrypt" ),
	Schema = mongoose.Schema,
	removeUserData = require( "../utils/removeUserData" ),

	UserSchema = mongoose.Schema({
		username: { type: String, required: true },
		email: { type: String, required: true },
		fullname: { type: String, required: true },
		passwordHash: { type: String, required: true },
		refreshToken: { type: String },
		posts: [ { type: Schema.Types.ObjectId, ref: "Post" } ],
		newsfeed: [ { type: Schema.Types.ObjectId, ref: "Post" } ],
		friends: [ { type: Schema.Types.ObjectId, ref: "User" } ],
		notifications: [ { type: Schema.Types.ObjectId, ref: "Notification" } ],
		newNotifications: { type: Number, default: 0 },
		pendingRequests: [ { type: String } ],
		openConversations: [ { type: Schema.Types.ObjectId, ref: "Conversation" } ],
		description: { type: String },
		hobbies: [ { type: String } ],
		profileImage: { type: String },
		headerImage: { type: String },
		interests: [ { type: String } ],
		totalLikes: { type: Number, default: 0 },
		totalViews: { type: Number, default: 0 },
		country: { type: String },
		region: { type: String },
		gender: { type: String },
		birthday: { type: Date },
		admin: { type: Boolean, default: false },
		infractions: [ { type: String } ],
		banned: { type: String },
		clubs: [ { type: Schema.Types.ObjectId, ref: "Club" } ]
	}, { timestamps: true });

UserSchema.methods.isValidPassword = function( password ) {
	if ( !password || !this.passwordHash ) {
		return false;
	}
	return bcrypt.compareSync( password, this.passwordHash );
};


const User = mongoose.model( "User", UserSchema );

UserSchema.post( "remove", async( user, next ) => {
	try {
		await removeUserData( user );
		next();
	} catch ( err ) {
		return next( err );
	}
});

module.exports = User;
