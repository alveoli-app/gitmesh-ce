
build-test:
	pnpm run build:staging

build-prod:
	pnpm run build:production

pull:
	git pull

deploy:	pull build-test
	wrangler publish

deploy-prod:	pull build-prod
	wrangler publish --env production
