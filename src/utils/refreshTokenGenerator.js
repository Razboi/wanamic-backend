const
	jwt = require( "jsonwebtoken" ),
	User = require( "../models/User" );

generateRefreshToken = async user => {
	if ( !user || !user._id ) {
		throw "No user or user._id";
	}
	try {
		const token = jwt.sign({ id: user.id }, process.env.SECRET_REFRESH );
		user.refreshToken = token;
		await user.save();
		return token;
	} catch ( err ) {
		throw err;
	}
};

module.exports = generateRefreshToken;
