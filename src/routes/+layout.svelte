<script lang="ts">
	import { page } from '$app/state';

	let { children } = $props();

	const links = [
		{ href: '/', label: 'Upload on change' },
		{ href: '/on-submit', label: 'Upload on submit' },
	];
</script>

<nav>
	{#each links as link (link.href)}
		<a href={link.href} aria-current={page.url.pathname === link.href ? 'page' : undefined}>
			{link.label}
		</a>
	{/each}
</nav>

{@render children()}

<style>
	nav {
		display: flex;
		gap: 0.5rem;
		justify-content: center;
		padding: 1rem;
		font-family: Arial, sans-serif;
	}
	a {
		padding: 0.5rem 1rem;
		border-radius: 999px;
		color: #007bff;
		text-decoration: none;
		font-weight: bold;
		transition:
			background-color 0.15s ease,
			color 0.15s ease;
	}
	a:hover {
		background-color: #e7f1ff;
	}
	a[aria-current='page'] {
		background-color: #007bff;
		color: white;
	}
</style>
