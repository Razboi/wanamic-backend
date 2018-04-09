const jwt = require( "jsonwebtoken" );

tokenVerifier = ( token, next ) => {
	var err;

	if ( !token ) {
		err = new Error( "Empty token" );
		err.statusCode = 401;
		return next( err );
	}
	try {
		// get userId from token
		userId = jwt.verify( token, process.env.SECRET_JWT );
		return userId;
	} catch ( err ) {
		err.statusCode = 401;
		return next( err );
	}
};

module.exports = tokenVerifier;
