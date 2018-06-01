const
	jwt = require( "jsonwebtoken" ),
	User = require( "../models/User" );

generateRefreshToken = user => {
	if ( user && user.id ) {
		const token = jwt.sign({ id: user.id }, process.env.SECRET_REFRESH );
		User.findById( user.id )
			.exec()
			.then( user => {
				user.refreshToken = token;
				user.save();
			}).catch( err => console.log( err ));
		return token;
	}
	return false;
};

module.exports = generateRefreshToken;
