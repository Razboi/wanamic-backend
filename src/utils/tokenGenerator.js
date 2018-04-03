const jwt = require( "jsonwebtoken" );

generateToken = user => {
	if ( user && user.id ) {
		const token = jwt.sign( user.id, process.env.SECRET_JWT );
		return token;
	}
	return false;
};

module.exports = generateToken;
