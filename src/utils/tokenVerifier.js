const jwt = require( "jsonwebtoken" );

tokenVerifier = ( token, cb ) => {
	var err;

	if ( !token ) {
		err = new Error( "Empty token" );
		err.statusCode = 401;
		throw err;
	}
	try {
		data = jwt.verify( token, process.env.SECRET_JWT );
		if ( cb ) {
			return cb( data.id );
		}
		return data.id;
	} catch ( err ) {
		err.statusCode = 401;
		throw err;
	}
};

module.exports = tokenVerifier;
