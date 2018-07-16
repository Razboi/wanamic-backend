const
	mongoose = require( "mongoose" ),
	bcrypt = require( "bcrypt" ),
	Schema = mongoose.Schema,

	UserSchema = mongoose.Schema({
		username: { type: String, required: true },
		email: { type: String, required: true },
		fullname: { type: String, required: true },
		passwordHash: { type: String, required: true },
		refreshToken: { type: String },
		posts: [ { type: Schema.Types.ObjectId, ref: "Post" } ],
		newsfeed: [ { type: Schema.Types.ObjectId, ref: "Post" } ],
		friends: [ { type: Schema.Types.ObjectId, ref: "User" } ],
		followers: [ { type: Schema.Types.ObjectId, ref: "User" } ],
		following: [ { type: Schema.Types.ObjectId, ref: "User" } ],
		notifications: [ { type: Schema.Types.ObjectId, ref: "Notification" } ],
		pendingRequests: [ { type: String } ],
		openConversations: [ { type: Schema.Types.ObjectId, ref: "Conversation" } ],
		chatNotifications: [ { type: String } ],
		description: { type: String },
		keywords: [ { type: String } ],
		profileImage: { type: String },
		headerImage: { type: String },
		interests: [ { type: String } ],
		totalLikes: { type: Number, default: 0 },
		totalViews: { type: Number, default: 0 },
		location: { type: String },
		gender: { type: String },
		birthday: { type: Date },
	});

UserSchema.methods.isValidPassword = function( password ) {
	if ( !password || !this.passwordHash ) {
		return false;
	}
	return bcrypt.compareSync( password, this.passwordHash );
};


const User = mongoose.model( "User", UserSchema );

module.exports = User;
