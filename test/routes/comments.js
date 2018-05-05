const
	chai = require( "chai" ),
	chaiHttp = require( "chai-http" ),
	should = chai.should(),
	request = require( "request" ),
	mongoose = require( "mongoose" ),
	dotenv = require( "dotenv" ),
	tokenGenerator = require( "../../src/utils/tokenGenerator" ),
	User = require( "../../src/models/User" ),
	Post = require( "../../src/models/Post" );


dotenv.config();
chai.use( chaiHttp );



describe( "POST comments/create", function() {
	var
		token,
		postId;
	before( function( done ) {
		User.findOne({ email: "test@gmail.com" })
			.exec()
			.then( user => {
				token = tokenGenerator( user );
				new Post({
					author: user.username,
					content: "test"
				}).save()
					.then( post => {
						postId = post.id;
						done();
					}).catch( err => done( err ));
			}).catch( err => done( err ));
	});

	it( "adds a new comment to a post, should return 201", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/comments/create" )
			.send({
				token: token,
				postId: postId,
				comment: "test"
			})
			.end(( err, res ) => {
				res.should.have.status( 201 );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/comments/create" )
			.send({
				token: token,
				postId: postId
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/comments/create" )
			.send({
				token: token,
				comment: "test"
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/comments/create" )
			.send({
				postId: postId,
				comment: "test"
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 malformed jwt", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/comments/create" )
			.send({
				token: "123213adasdsad21321321",
				postId: postId,
				comment: "test"
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});

	after( function( done ) {
		Post.remove({ _id: postId })
			.exec()
			.then(() => done())
			.catch( err => done( err ));
	});
});


describe( "POST comments/postComments/:skip", function() {
	var
		token,
		postId;
	before( function( done ) {
		User.findOne({ email: "test@gmail.com" })
			.exec()
			.then( user => {
				token = tokenGenerator( user );
				new Post({
					author: user.username,
					content: "test"
				}).save()
					.then( post => {
						postId = post.id;
						done();
					}).catch( err => done( err ));
			}).catch( err => done( err ));
	});

	it( "gets the post comments, should return 200", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/comments/postComments/0" )
			.send({
				token: token,
				postId: postId
			})
			.end(( err, res ) => {
				res.should.have.status( 200 );
				done();
			});
	});

	it( "should return 404 for endpoint not found", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/comments/postComments/" )
			.send({
				token: token,
				postId: postId
			})
			.end(( err, res ) => {
				res.should.have.status( 404 );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/comments/postComments/0" )
			.send({
				token: token
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/comments/postComments/0" )
			.send({
				postId: postId
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 malformed jwt", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/comments/postComments/0" )
			.send({
				token: "123213adasdsad21321321",
				postId: postId
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});

	after( function( done ) {
		Post.remove({ _id: postId })
			.exec()
			.then(() => done())
			.catch( err => done( err ));
	});
});
