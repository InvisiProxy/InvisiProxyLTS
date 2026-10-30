import { Inline, route, values } from '../document-helpers.tsx';

export default function Challenge() {
	return (
		<div class="challenge" data-challenge hidden>
			<Inline>
				<link
					rel="stylesheet"
					href={route('assets/css/challenge.css', 'inline')}
				/>
			</Inline>
			<main class="challenge-main">
				<h1 class="challenge-host">
					<img
						class="challenge-icon"
						src={route('assets/ico/favicon-32x32.png')}
						alt=""
					/>
					<span data-host></span>
				</h1>
				<h2 class="challenge-title">
					Performing security verification
				</h2>
				<p class="challenge-text">
					This website uses a security service to protect against
					malicious bots. This page is displayed while the website
					verifies you are not a bot.
				</p>
				<label class="challenge-widget" data-verify>
					<input class="challenge-box" type="checkbox" />
					<span>Verify you are human</span>
				</label>
				<div class="challenge-widget" data-verifying hidden>
					<span class="challenge-spinner"></span>
					<span>Verifying...</span>
				</div>
				<section class="challenge-notice" data-notice hidden>
					<h2 class="challenge-title">
						InvisiProxy LTS (PLEASE READ)
					</h2>
					<p class="challenge-text">
						In the case of a "500 Internal Error/403 Forbidden"
						error simply head back to the main page of the site at
						"/" which serves as an entry point. This is a feature
						IVLTS has to evade filters.
					</p>
					<a class="challenge-button" href={values.basePath}>
						Go to the main page
					</a>
				</section>
			</main>
			<footer class="challenge-footer">
				<div>
					Ray ID: <code class="challenge-ray" data-ray></code>
				</div>
				<div>Performance and Security by Cloudflare | Privacy</div>
			</footer>
		</div>
	);
}
