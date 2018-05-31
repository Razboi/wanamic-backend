const jwt = require( "jsonwebtoken" );

generateToken = user => {
	if ( user && user.id ) {
		const token = jwt.sign({ id: user.id }, process.env.SECRET_JWT, {
			expiresIn: "1h"
		});
		return token;
	}
	return false;
};

module.exports = generateToken;
