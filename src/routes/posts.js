const
	Router = require( "express" ).Router(),
	User = require( "../models/User" ),
	jwt = require( "jsonwebtoken" ),
	Post = require( "../models/Post" );

Router.post( "/create", ( req, res, next ) => {
	var
		err,
		data,
		userId,
		username;

	if ( !req.body.post || !req.body.post.token || !req.body.post.content ) {
		err = new Error( "Empty post data" );
		err.statusCode = 422;
		return next( err );
	}

	data = req.body.post;

	try {
		userId = jwt.verify( data.token, process.env.SECRET_JWT );
	} catch ( err ) {
		err.statusCode = 401;
		return next( err );
	}

	User.findById( userId )
		.then( user => {
			if ( !user ) {
				err = new Error( "User doesn't exist" );
				err.statusCode = 404;
				return next( err );
			}
			// TODO: change user.email to user.username
			username = user.email;

			new Post({
				authorId: userId,
				authorUsername: username,
				content: data.content
			}).save()
				.then(() => {
					res.sendStatus( 201 );
				})
				.catch( err => next( err ));
		}).catch( err => next( err ));
});


Router.get( "/:username", ( req, res, next ) => {
	var
		err;

	if ( !req.params.username ) {
		err = new Error( "User doesn't exist" );
		err.statusCode = 404;
		return next( err );
	}

	Post.find({ authorUsername: req.params.username })
		.then( posts => res.send( posts ))
		.catch( err => next( err ));
});

Router.delete( "/delete", ( req, res, next ) => {
	var
		post,
		err;

	if ( !req.body.post || !req.body.post.id ) {
		err = new Error( "Empty post data" );
		err.statusCode = 422;
		return next( err );
	}

	post = req.body.post;

	Post.remove({ _id: post.id })
		.then(() => {
			res.sendStatus( 200 );
		}).catch( err => next( err ));
});


Router.patch( "/update", ( req, res, next ) => {
	var
		updatedPost,
		token,
		userId,
		err;

	if ( !req.body.data || !req.body.data.post || !req.body.data.token
		|| !req.body.data.post.id || !req.body.data.post.content ) {
		err = new Error( "Empty data" );
		err.statusCode = 422;
		return next( err );
	}

	updatedPost = req.body.data.post;
	token = req.body.data.token;

	try {
		// get userId from token
		userId = jwt.verify( token, process.env.SECRET_JWT );
	} catch ( err ) {
		err.statusCode = 401;
		return next( err );
	}

	Post.findById( updatedPost.id )
		.then( storedPost => {
			if ( userId !== storedPost.authorId ) {
				err = new Error( "Requester isn't the author" );
				err.statusCode = 401;
				return next( err );
			}
			if ( updatedPost.content ) {
				storedPost.content = updatedPost.content;
			};
			storedPost.save().then(() => res.sendStatus( 200 ));
		}).catch( err => next( err ));
});


module.exports = Router;
