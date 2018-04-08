const
	mongoose = require( "mongoose" ),
	bcrypt = require( "bcrypt" ),
	Schema = mongoose.Schema,

	UserSchema = mongoose.Schema({
		username: { type: String },
		email: { type: String, required: true },
		fullname: { type: String },
		passwordHash: { type: String },
		posts: [ { type: Schema.Types.ObjectId, ref: "Post" } ],
		newsfeed: [ { type: Schema.Types.ObjectId, ref: "Post" } ]
	});

UserSchema.methods.isValidPassword = function( password ) {
	if ( !password || !this.passwordHash ) {
		return false;
	}
	return bcrypt.compareSync( password, this.passwordHash );
};


const User = mongoose.model( "User", UserSchema );

module.exports = User;
