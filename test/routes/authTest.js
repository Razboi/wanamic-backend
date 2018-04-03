const
	chai = require( "chai" ),
	chaiHttp = require( "chai-http" ),
	should = chai.should(),
	request = require( "request" ),
	mongoose = require( "mongoose" ),
	dotenv = require( "dotenv" ),
	User = require( "../../src/models/User" );

dotenv.config();
chai.use( chaiHttp );

describe( "auth/signup", function() {
	// before testing connect to the db and delete the testing account
	before( function( done ) {
		mongoose.connect( process.env.MONGODB_URL );
		User.remove({ email: "test@gmail.com" })
			.then(() => {
				done();
			});
	});

	it( "should return 201", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/auth/signup" )
			.send({
				credentials: {
					email: "test@gmail.com",
					password: "test"
				}
			})
			.end(( err, res ) => {
				res.should.have.status( 201 );
				res.text.should.be.a( "string" );
				done();
			});
	});

	it( "should return 422 for blank credentials", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/auth/signup" )
			.send({
				credentials: {
					email: "test@gmail.com",
					password: ""
				}
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Empty credentials" );
				done();
			});
	});

	it( "should return 422 for already registered email", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/auth/signup" )
			.send({
				credentials: {
					email: "test@gmail.com",
					password: "test"
				}
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Already registered email" );
				done();
			});
	});
});
