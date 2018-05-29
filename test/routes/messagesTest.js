const
	chai = require( "chai" ),
	chaiHttp = require( "chai-http" ),
	should = chai.should(),
	request = require( "request" ),
	mongoose = require( "mongoose" ),
	dotenv = require( "dotenv" ),
	bcrypt = require( "bcrypt" ),
	tokenGenerator = require( "../../src/utils/tokenGenerator" ),
	Message = require( "../../src/models/Message" ),
	User = require( "../../src/models/User" );

dotenv.config();
chai.use( chaiHttp );
mongoose.connect( process.env.MONGODB_URL );


after( function( done ) {
	User.remove({ email: "test@gmail.com" })
		.then(() => {
			User.remove({ email: "test2@gmail.com" })
				.then(() => {
					Message.remove({ receiver: "testuser" })
						.then(() => done())
						.catch( err => done( err ));
				}).catch( err => done( err ));
		}).catch( err => done( err ));
});

before( function( done ) {
	new User({
		email: "test@gmail.com",
		username: "testuser",
		fullname: "Test User",
		passwordHash: bcrypt.hashSync( "test", 10 )
	})
		.save()
		.then(() => {
			new User({
				email: "test2@gmail.com",
				username: "testuser2",
				fullname: "Test User2",
				passwordHash: bcrypt.hashSync( "test", 10 )
			})
				.save()
				.then(() => done())
				.catch( err => done( err ));
		}).catch( err => done( err ));
});


describe( "POST messages/retrieve", function() {
	var token;

	before( function( done ) {
		User.findOne({ email: "test@gmail.com" })
			.exec()
			.then( user => {
				token = tokenGenerator( user );
				done();
			}).catch( err => done( err ));
	});

	it( "returns messages, should return 200", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/messages/retrieve" )
			.send({
				token: token,
				friendUsername: "testuser"
			})
			.end(( err, res ) => {
				res.should.have.status( 200 );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/messages/retrieve" )
			.send({ token: token })
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/messages/retrieve" )
			.send({ friendUsername: "testuser" })
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 malformed jwt", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/messages/retrieve" )
			.send({
				token: "123213adasdsad21321321",
				friendUsername: "testuser"
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});


describe( "POST messages/add", function() {
	var token;

	before( function( done ) {
		User.findOne({ email: "test@gmail.com" })
			.exec()
			.then( user => {
				token = tokenGenerator( user );
				done();
			}).catch( err => done( err ));
	});

	it( "returns messages, should return 200", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/messages/add" )
			.send({
				token: token,
				friendUsername: "testuser",
				content: "sup"
			})
			.end(( err, res ) => {
				res.should.have.status( 201 );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/messages/add" )
			.send({
				token: token,
				friendUsername: "testuser"
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/messages/add" )
			.send({
				friendUsername: "testuser",
				content: "sup"
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/messages/add" )
			.send({
				token: token,
				content: "sup"
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 malformed jwt", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/messages/add" )
			.send({
				token: "123213adasdsad21321321",
				friendUsername: "testuser",
				content: "sup"
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});
