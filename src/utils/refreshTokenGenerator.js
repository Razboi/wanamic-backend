const
	randtoken = require( "rand-token" ),
	User = require( "../models/User" );

generateRefreshToken = user => {
	if ( user && user.id ) {
		const token = randtoken.uid( 256 );
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
