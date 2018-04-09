const
	chai = require( "chai" ),
	chaiHttp = require( "chai-http" ),
	should = chai.should(),
	request = require( "request" ),
	mongoose = require( "mongoose" ),
	dotenv = require( "dotenv" ),
	tokenGenerator = require( "../../src/utils/tokenGenerator" ),
	Post = require( "../../src/models/Post" ),
	User = require( "../../src/models/User" );

dotenv.config();
chai.use( chaiHttp );
mongoose.connect( process.env.MONGODB_URL );

describe( "POST posts/create", function() {
	var token;
	// before running tests delete the old post tests and create a token
	before( function( done ) {
		Post.remove({ author: "test@gmail.com" })
			.then(() => {
				User.findOne({ email: "test@gmail.com" })
					.exec()
					.then( user => {
						token = tokenGenerator( user );
						done();
					}).catch( err => console.log( err ));
			}).catch( err => console.log( err ));
	});

	it( "creates a new post, should return 201", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/posts/create" )
			.send({
				post: { token: token, content: "test2" }
			})
			.end(( err, res ) => {
				res.should.have.status( 201 );
				done();
			});
	});

	it( "should return 422 for empty data", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/posts/create" )
			.send({
				post: {}
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				done();
			});
	});

	it( "should return 401 for invalid token", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/posts/create" )
			.send({
				post: { token: "1232312sadasd213213", content: "test2" }
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				done();
			});
	});
});


describe( "GET posts/:username/:skip", function() {
	var
		token;

	before( function( done ) {
		User.findOne({ email: "test@gmail.com" })
			.exec()
			.then( user => {
				token = tokenGenerator( user );
				done();
			}).catch( err => console.log( err ));
	});

	it( "should get the user  posts", function( done ) {
		chai.request( "localhost:8000" )
			.get( "/posts/test@gmail.com/0" )
			.end(( err, res ) => {
				res.should.have.status( 200 );
				done();
			});
	});

	it( "should get the user newsfeed", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/posts/newsfeed/0" )
			.send({
				token: token
			})
			.end(( err, res ) => {
				res.should.have.status( 200 );
				done();
			});
	});

	it( "should return 404 User doesn't exist", function( done ) {
		chai.request( "localhost:8000" )
			.get( "/posts/" )
			.end(( err, res ) => {
				res.should.have.status( 404 );
				done();
			});
	});
});


describe( "DELETE posts/delete", function() {
	var
		token,
		postId;

	before( function( done ) {
		User.findOne({ email: "test@gmail.com" })
			.exec()
			.then( user => {
				token = tokenGenerator( user );
				Post.findOne({ author: "test@gmail.com" })
					.exec()
					.then( post => {
						postId = post.id;
						done();
					}).catch( err => console.log( err ));
			}).catch( err => console.log( err ));
	});

	it( "should return 200", function( done ) {
		chai.request( "localhost:8000" )
			.delete( "/posts/delete" )
			.send({
				post: { id: postId, token: token }
			})
			.end(( err, res ) => {
				res.should.have.status( 200 );
				done();
			});
	});

	it( "should return 422 Empty post data", function( done ) {
		chai.request( "localhost:8000" )
			.delete( "/posts/delete" )
			.send({
				post: {}
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				done();
			});
	});
});


describe( "PATCH posts/update", function() {
	var
		token,
		invalidToken,
		postId;

	// before updating a post we need to create the post and get the user token and postId
	before( function( done ) {
		User.findOne({ email: "test@gmail.com" })
			.exec()
			.then( user => {
				token = tokenGenerator( user );
				new Post({
					author: user.email,
					content: "update test"
				}).save()
					.then( post => {
						postId = post.id;
						done();
					}).catch( err => console.log( err ));
			}).catch( err => console.log( err ));
	});

	it( "should return 200 and update the post", function( done ) {
		chai.request( "localhost:8000" )
			.patch( "/posts/update" )
			.send({
				data: {
					token: token,
					post: { id: postId, content: "Updated content :)" }
				}
			})
			.end(( err, res ) => {
				res.should.have.status( 200 );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.patch( "/posts/update" )
			.send({
				data: {
					token: token,
					post: {}
				}
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Empty data" );
				done();
			});
	});

	// before testing get the invalid userToken. If the user doesn't exists create it
	before( function( done ) {
		User.findOne({ email: "test2@gmail.com" })
			.exec()
			.then( user => {
				if ( !user ) {
					chai.request( "localhost:8000" )
						.post( "/auth/signup" )
						.send({
							credentials: {
								email: "test2@gmail.com",
								password: "test"
							}
						})
						.end(( err, res ) => {
							invalidToken = res.text;
							done();
						});
				} else {
					invalidToken = tokenGenerator( user );
					done();
				}
			}).catch( err => console.log( err ));
	});

	it( "should return 401 malformed jwt", function( done ) {
		chai.request( "localhost:8000" )
			.patch( "/posts/update" )
			.send({
				data: {
					token: invalidToken,
					post: { id: postId, content: "Should not update" }
				}
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "Requester isn't the author" );
				done();
			});
	});

	after( function( done ) {
		Post.remove({ _id: postId })
			.exec()
			.then(() => done())
			.catch( err => console.log( err ));
	});
});
