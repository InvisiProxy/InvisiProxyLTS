import {
	iconBookmarklet,
	translate,
	Translation,
} from '../document-helpers.tsx';

export default function FAQ() {
	return (
		<>
			<div class="faq-center bigtitle">
				<h1>{translate('faq.title')}</h1>
			</div>
			<div class="faq-box">
				<div
					id="faq-search-root"
					data-placeholder={translate('faq.search')}
					data-label={translate('faq.searchLabel')}
				>
					<input
						class="faq-search"
						type="text"
						autocomplete="off"
						spellcheck="false"
						placeholder={translate('faq.search')}
					/>
				</div>
			</div>
			<br></br>
			<div id="faqs" class="faq">
				<div class="faq-text">
					<h3>
						<strong>{translate('faq.icons.question')}</strong>
					</h3>
					<p>{translate('faq.icons.bookmarklet')}</p>
					<br></br>
					<div id="bks-parent">
						<a
							href={iconBookmarklet()}
							id="iconfinder"
							class="fancybutton fb-l glowbutton"
						>
							{translate('faq.icons.button')}
						</a>
					</div>
					<br></br>
					<p>{translate('faq.icons.copy')}</p>
				</div>
				<div class="faq-text">
					<h3>
						<strong>
							{translate('faq.networkError.question')}
						</strong>
					</h3>
					<p>{translate('faq.networkError.answer')}</p>
					<p>{translate('faq.networkError.note')}</p>
				</div>
				<div class="faq-text">
					<h3>
						<strong>{translate('faq.bot.question')}</strong>
					</h3>
					<p>{translate('faq.bot.answer')}</p>
				</div>
				<div class="faq-text">
					<h3>
						<strong>{translate('faq.unreachable.question')}</strong>
					</h3>
					<p>{translate('faq.unreachable.answer')}</p>
				</div>
				<div class="faq-text">
					<h3>
						<strong>{translate('faq.blank.question')}</strong>
					</h3>
					<p>{translate('faq.blank.answer')}</p>
				</div>
				<div class="faq-text">
					<h3>
						<strong>{translate('faq.idb.question')}</strong>
					</h3>
					<p>{translate('faq.idb.answer')}</p>
				</div>
				<div class="faq-text">
					<h3>
						<strong>{translate('faq.discord.question')}</strong>
					</h3>
					<p>{translate('faq.discord.answer')}</p>
					<ul>
						<li>{translate('faq.discord.note')}</li>
					</ul>
				</div>
				<div class="faq-text">
					<h3>
						<strong>{translate('faq.youtube.question')}</strong>
					</h3>
					<p>{translate('faq.youtube.answer')}</p>
					<p>{translate('faq.youtube.tor')}</p>
				</div>
				<div class="faq-text">
					<h3>
						<strong>{translate('faq.login.question')}</strong>
					</h3>
					<p>{translate('faq.login.answer')}</p>
				</div>
				<div class="faq-text">
					<h3>
						<strong>{translate('faq.captcha.question')}</strong>
					</h3>
					<p>{translate('faq.captcha.answer')}</p>
				</div>
				<div class="faq-text">
					<h3>
						<strong>
							{translate('faq.youtubeBlank.question')}
						</strong>
					</h3>
					<p>{translate('faq.youtubeBlank.answer')}</p>
					<ul>
						<li>
							<p>{translate('faq.youtubeBlank.reload')}</p>
						</li>
						<li>
							<p>
								<Translation id="faq.youtubeBlank.reloadFrame" />
							</p>
						</li>
					</ul>
				</div>
			</div>
		</>
	);
}
