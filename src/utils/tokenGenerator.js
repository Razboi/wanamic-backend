const
	jwt = require( "jsonwebtoken" );

generateToken = ( user, emailToken ) => {
	let token;

	if ( !user || !user.id ) {
		return false;
	}
	try {
		if ( emailToken ) {
			token = jwt.sign({ id: user.id }, process.env.SECRET_EMAIL, {
				expiresIn: "1h"
			});
		} else {
			token = jwt.sign({ id: user.id }, process.env.SECRET_JWT, {
				expiresIn: "1m"
			});
		}
	} catch ( err ) {
		throw err;
	}
	return token;
};

module.exports = generateToken;
