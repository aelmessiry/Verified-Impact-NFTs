import React from 'react';
import { Col, Container, Row, Spinner } from 'react-bootstrap';
import ImageUploader from 'react-images-upload';
import { toast as VIToast } from 'react-toastify';
import ReactGA from 'react-ga';
import { Form } from 'react-bootstrap';
import CreatableSelect from 'react-select/creatable';
import validator from 'validator';
// import { NFTStorage } from 'nft.storage';
import { NFTStorage } from 'nft.storage/dist/bundle.esm.min.js';
import { CLPublicKey } from 'casper-js-sdk';

import { useAuth } from '../../../contexts/AuthContext';
import {
  useNFTState,
  useNFTDispatch,
  refreshNFTs,
  refreshCollections,
} from '../../../contexts/NFTContext';
import { mint } from '../../../api/mint';
import { getDeployDetails } from '../../../api/universal';
import { profileClient } from '../../../api/profileInfo';

import PageTitle from '../../Layout/PageTitle';
import PromptLogin from '../PromptLogin';
import Layout from '../../Layout';

import { NFT_STORAGE_KEY } from '../../../constants/blockchain';

import bnr1 from './../../../images/banner/bnr1.jpg';
import { sendDiscordMessage } from '../../../utils/discordEvents';
import { SendTweet, SendTweetWithImage } from '../../../utils/VINFTsTweets';

import SDGsMultiSelect from '../../Element/SDGsMultiSelect';
import { SDGsData } from '../../../data/SDGsGoals';
//handling of creating new option in creatable select control
const createOption = (label) => ({
  label,
  value: label.toLowerCase().replace(/\W/g, ''),
});

//minting new nft page
const MintNFT = () => {
  const { entityInfo, refreshAuth, isLoggedIn } = useAuth();
  const { ...stateList } = useNFTState();
  const { campaigns, beneficiaries, collections } = stateList;
  const nftDispatch = useNFTDispatch();
  const pictureElement = React.useRef(null);
  let storageData = localStorage.getItem('selectedData');
  let savedData = storageData ? JSON.parse(storageData) : null;
  const [showURLErrorMsg, setShowURLErrorMsg] = React.useState(false);
  const [isMintClicked, setIsMintClicked] = React.useState(false);
  const [isMintAnotherClicked, setIsMintAnotherClicked] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [beneficiary, setBeneficiary] = React.useState();
  const [campaign, setCampaign] = React.useState();
  const [collectionsList, setCollectionsList] = React.useState();
  const [campaignsList, setCampaignsList] = React.useState();
  const [allCampaignsList, setAllCampaignsList] = React.useState();
  const [creator, setCreator] = React.useState('');
  const [isCreatorExist, setIsCreatorExist] = React.useState();
  const [creatorPercentage, setCreatorPercentage] = React.useState();
  const [uploadedImageBlob, setUploadedBlobImage] = React.useState(null);
  const [uploadedImageURL, setUploadedImage] = React.useState(null);
  const [selectedCollectionValue, setSelectedCollectionValue] = React.useState(
    {}
  );
  const [isCreateNewCollection, setIsCreateNewCollection] = React.useState();
  const [beneficiaryPercentage, setBeneficiaryPercentage] = React.useState();
  const [creatorTwitterLink, setCreatorTwitterLink] = React.useState('');
  const [SDGsGoals, setSDGsGoals] = React.useState([]);
  const [SDGsGoalsData, setSDGsGoalsData] = React.useState([]);
  const [isNewNftMinted, setIsNewNftMinted] = React.useState(false);
  const [isClearSDGs, setIsClearSDGs] = React.useState(false);

  // const [beneficiariesList, setBeneficiariesList] = React.useState();
  const [state, setState] = React.useState({
    inputs: {
      name: '',
      description: '',
      price: '',
      isForSale: false,
      currency: 'CSPR',
      beneficiaryPercentage: '',
      isImageURL: false,
      isAuthorBeneficiary:false
    },
  });

  const loadCollections = React.useCallback(async () => {
    if (entityInfo.publicKey) {
      let userProfiles = await profileClient.getProfile(entityInfo.publicKey);
      if (userProfiles) {
        if (userProfiles.err === 'Address Not Found') {
          setCreator(null);
          setIsCreatorExist(false);
          setCollectionsList();
        } else {
          let list = Object.values(userProfiles)[0];

          userProfiles && setCreator(list?.creator?.username);
          userProfiles && setCreatorTwitterLink(list?.creator?.twitter);
          userProfiles && setIsCreatorExist(true);
          if (list?.creator?.address !== '') {
            const _collections =
              // existingCreator &&
              collections &&
              collections.filter(
                ({ creator }) =>
                  creator ===
                  CLPublicKey.fromHex(entityInfo.publicKey)
                    .toAccountHashStr()
                    .slice(13)
              );

            const selectedCollections =
              _collections &&
              _collections?.map((col) => ({
                value: col.id,
                label: col.name,
              }));

            selectedCollections && setCollectionsList(selectedCollections);
            const selectedCollectionsIDs =
              selectedCollections &&
              selectedCollections.map(({ value }) => value);
            selectedCollections &&
              selectedCollections.length > 0 &&
              setSelectedCollectionValue(
                savedData &&
                  selectedCollectionsIDs.includes(savedData.collection.value)
                  ? savedData.collection
                  : selectedCollections[0]
              );
          } else {
            setCollectionsList();
          }
        }
      }
    }
  }, [
    entityInfo.publicKey,
    collections,
    setCollectionsList,
    setCreator,
    setIsCreatorExist,
    setSelectedCollectionValue,
    savedData,
  ]);

  React.useEffect(() => {
    loadCollections();
  }, [isNewNftMinted]);

  React.useEffect(() => {
    ReactGA.pageview(window.location.pathname + '/mint-nft');
    const allowedBeneAddress = beneficiaries
      ?.filter(({ isApproved }) => isApproved === 'true')
      .map(({ address }) => address);

    beneficiaries?.length &&
      !beneficiary &&
      setBeneficiary(
        savedData && allowedBeneAddress.includes(savedData.beneficiary)
          ? savedData.beneficiary
          : beneficiaries?.filter(({ isApproved }) => isApproved === 'true')[0]
              ?.address
      );
    // campaigns?.length &&
    //   !campaign &&
    //   setCampaign(savedData ? savedData.campaign : campaigns[0]?.id);

    const filteredCampaigns =
      !campaignsList &&
      campaigns?.length &&
      campaigns.filter(
        ({ beneficiary_address }) =>
          (savedData
            ? savedData.beneficiary
            : beneficiaries?.filter(
                ({ isApproved }) => isApproved === 'true'
              )[0]?.address) === beneficiary_address
      );
    filteredCampaigns?.length && setCampaignsList(filteredCampaigns);

    !campaignsList &&
      campaigns?.length &&
      filteredCampaigns?.length &&
      setAllCampaignsList(campaigns);
    if (!campaignsList) {
      const selectedCampaignIDs =
        filteredCampaigns?.length > 0 && filteredCampaigns.map(({ id }) => id);
      filteredCampaigns?.length
        ? setCampaignSelectedData(
            filteredCampaigns,
            savedData && selectedCampaignIDs.includes(savedData?.campaign)
              ? savedData.campaign
              : filteredCampaigns[0]?.id
          )
        : setCampaignSelectedData(null, null);
    }
    filteredCampaigns &&
      setSDGsGoalsData(
        SDGsData.filter(({ value }) =>
          filteredCampaigns[0]?.sdgs_ids?.split(',').includes(value.toString())
        )
      );
  }, [
    campaignsList,
    campaigns,
    beneficiaries,
    beneficiary,
    campaign,
    // setBeneficiary,
    // setCampaign,
    // setCampaignsList,
    savedData,
  ]);

  React.useEffect(() => {
    !collectionsList && loadCollections();
  }, [collectionsList, collections, loadCollections]);

  //handling of adding new option to the existing collections in creatable select
  const handleCreate = (inputValue) => {
    setIsLoading(true);
    console.group('Option created');
    console.log('Wait a moment...');
    setTimeout(() => {
      const newOption = createOption(inputValue);
      console.log(newOption);
      console.groupEnd();
      setIsLoading(false);
      setCollectionsList([...collections, newOption]);
      setSelectedCollectionValue(newOption);
      setIsCreateNewCollection(true);
    }, 1000);
  };

  const handleChange = (e, isBeneficiary = false) => {
    const { value, name, checked, type } = e.target;
    const { inputs } = state;
    if (isBeneficiary) {
      let selectedBeneficiary = beneficiaries
        ?.filter(({ isApproved }) => isApproved === 'true')
        .find(({ address }) => address === value);
      const filteredCampaigns = allCampaignsList?.filter(
        ({ beneficiary_address }) =>
          selectedBeneficiary.address === beneficiary_address
      );
      setCampaignsList(filteredCampaigns);
      filteredCampaigns?.length > 0
        ? setCampaignSelectedData(filteredCampaigns, filteredCampaigns[0].id)
        : setCampaignSelectedData(null, null);
      setSDGsGoalsData(
        SDGsData.filter((sdg) =>
          filteredCampaigns[0]?.sdgs_ids
            ?.split(',')
            .includes(sdg.value.toString())
        )
      );
    }
    inputs[name] = type === 'checkbox' ? checked : value;
    setState({
      ...state,
      inputs,
    });
  };

  const handleSDGsChange = (data) => {
    setSDGsGoals(data);
  };

  //handling of selecting image in image control
  const onDrop = (picture, file) => {
    if (picture.length > 0) {
      setUploadedBlobImage(picture[0]);
    } else {
      setUploadedBlobImage(null);
      // setUploadedFile(null);
    }
  };

  //handling minting new NFT
  async function mintNFT(isAnotherMint) {
    // updateNFTs(nftDispatch, { ...stateList });
    if (!uploadedImageBlob) {
      return VIToast.error('Please upload image.');
    }
    if (!entityInfo.publicKey) {
      return VIToast.error('Please enter sign in First');
    }
    if (state.inputs.isImageURL && showURLErrorMsg) {
      return;
    }
    isAnotherMint ? setIsMintAnotherClicked(true) : setIsMintClicked(true);
    // let cloudURL = uploadedImageURL;
    let imageFile;
    if (!state.inputs.isImageURL && uploadedImageBlob) {
      // console.log('Img', uploadedFile);
      // console.log('Img url', uploadedImageBlob.name);
      try {
        //   const image = new File([uploadedImageBlob], uploadedImageBlob.name, {
        //     type: uploadedImageBlob.type,
        //   });
        const client = new NFTStorage({ token: NFT_STORAGE_KEY });
        imageFile = await client.store({
          name: uploadedImageBlob.name,
          description: 'description',
          image: uploadedImageBlob,
        });
      } catch (err) {
        console.log(err);
        VIToast.error("Image couldn't be uploaded to cloud CDN !");
        return;
      }
      VIToast.success('Image uploaded to cloud CDN successfully !');
    }
    let fineHref = imageFile?.data?.image?.pathname?.slice(2);
    //https://dweb.link/ipfs/
    // imageFile = 'https://vinfts.mypinata.cloud/ipfs' + fineHref;
    mintNewNFT(fineHref, isAnotherMint);
  }

  async function mintNewNFT(imgURL, isAnotherMint) {
    if (!uploadedImageBlob) {
      return VIToast.error('Please upload image.');
    }

    if (entityInfo.publicKey) {
      let mintDeployHash;
      try {
        mintDeployHash = await mint(entityInfo.publicKey, creator, {
          title: state.inputs.name,
          description: state.inputs.description,
          image: imgURL,
          price: state.inputs.price || '0',
          isForSale: !!state.inputs.isForSale,
          campaign: campaign || '',
          currency: state.inputs.currency,
          collection: isCreateNewCollection
            ? '0'
            : selectedCollectionValue.value,
          collectionName: isCreateNewCollection
            ? selectedCollectionValue.label
            : '',
          creator: entityInfo.publicKey,
          creatorPercentage: creatorPercentage?.toString()
            ? creatorPercentage.toString()
            : '',
          beneficiary: beneficiary || '',
          beneficiaryPercentage: beneficiaryPercentage
            ? beneficiaryPercentage
            : '',
          sdgs_ids: SDGsGoals,
          hasReceipt: false,
        });
      } catch (err) {
        if (err.message.includes('User Cancelled')) {
          VIToast.error('User Cancelled Signing');
          ReactGA.event({
            category: 'User Cancelation',
            action: 'Mint',
            label: `${entityInfo.publicKey}: Cancelled Signing`,
          });
        } else {
          VIToast.error(err.message);
          ReactGA.event({
            category: 'Error',
            action: 'Mint',
            label: `${entityInfo.publicKey}: ${err.message}`,
          });
        }
        setIsMintClicked(false);
        setIsMintAnotherClicked(false);
        return;
      }

      try {
        let s = [];
        if (SDGsGoals.length > 0) {
          SDGsGoals.map((sdg) => s.push(`#SDG${sdg}`));
        }
        const deployResult = await getDeployDetails(mintDeployHash);
        if (
          campaign !== '' &&
          campaign !== null &&
          beneficiary !== '' &&
          beneficiary !== null &&
          selectedCollectionValue !== '' &&
          selectedCollectionValue !== null &&
          isAnotherMint
        ) {
          localStorage.setItem(
            'selectedData',
            JSON.stringify({
              campaign: campaign,
              beneficiary: beneficiary,
              collection: {
                value: selectedCollectionValue.value,
                label: selectedCollectionValue.label,
              },
            })
          );
        } else {
          localStorage.setItem('selectedData', null);
        }
        console.log('...... Token minted successfully', deployResult);
        VIToast.success('NFT minted successfully');
        await refreshNFTs(nftDispatch, stateList);
        setState({
          inputs: {
            name: '',
            description: '',
            price: '',
            isForSale: false,
            currency: 'CSPR',
            beneficiaryPercentage: '',
            isImageURL: false,
          },
        });
        setBeneficiary(isAnotherMint ? beneficiary : undefined);
        setCampaign(isAnotherMint ? campaign : undefined);
        setUploadedBlobImage(null);
        pictureElement.current.clearPictures();
        setSDGsGoals([]);
        setIsClearSDGs(!isClearSDGs);
        setIsNewNftMinted(!isNewNftMinted);
        let twitterName = '';
        if (creatorTwitterLink !== '') {
          var n = creatorTwitterLink.lastIndexOf('/');
          twitterName = `@${creatorTwitterLink.substring(n + 1)}`;
        }
        //NOTE: every channel has a special keys and tokens sorted on .env file
        if (!isCreatorExist) {
          //add creator discord
          await sendDiscordMessage(
            process.env.REACT_APP_CREATORS_WEBHOOK_ID,
            process.env.REACT_APP_CREATORS_TOKEN,
            creator,
            '',
            `We are glad to announce that ${creator} creator has joined #verified-impact-nfts and minted a striking #NFT for donations. [Click here to see more about creators and their NFTs collections.](${window.location.origin}/#/) @vinfts @casper_network @devxdao `
          );
          await SendTweet(
            `We are glad to announce that ${creator} creator has joined #verified_impact_nfts and minted a striking #NFT for donations. Click here ${window.location.origin}/#/ to see more about creators and their NFTs collections @vinfts @casper_network @devxdao ${twitterName}`
          );
        }
        if (isCreateNewCollection) {
          await refreshCollections(nftDispatch, stateList);
          //add collection discord
          await sendDiscordMessage(
            process.env.REACT_APP_COLLECTIONS_WEBHOOK_ID,
            process.env.REACT_APP_COLLECTIONS_TOKEN,
            selectedCollectionValue.label,
            '',
            `${creator} creator has just added a new interesting #verified-impact-nfts collection. [Click here to see more interesting collections](${window.location.origin}/#/) @casper_network @devxdao `
          );
          await SendTweet(
            `${creator} creator has just added a new interesting #verified_impact_nfts collection ${s
              .toString()
              .replaceAll(',', ' ')}. Click here ${
              window.location.origin
            }/#/ to see more interesting collections  @vinfts @casper_network @devxdao ${twitterName}`
          );
        }

        await sendDiscordMessage(
          process.env.REACT_APP_NFT_WEBHOOK_ID,
          process.env.REACT_APP_NFT_TOKEN,
          state.inputs.name,
          '',
          `Great news! [${state.inputs.name}] #NFT  has been added to #verified-impact-nfts [click here to know more about their cause.](${window.location.origin}/#/) @vinfts @casper_network @devxdao `
        );
        let image = encodeURI('https://vinfts.mypinata.cloud/ipfs/' + imgURL);
        await SendTweetWithImage(
          image,
          `Great news! "${
            state.inputs.name
          }" #NFT  has been added to #verified_impact_nfts. ${s
            .toString()
            .replaceAll(',', ' ')} click here ${
            window.location.origin
          }/#/ to know more about their cause. @vinfts @casper_network @devxdao ${twitterName}`
        );
        ReactGA.event({
          category: 'Success',
          action: 'Mint',
          label: `${creator}: ${entityInfo.publicKey} mint new NFT successfully`,
        });
        //window.location.reload();
        setIsMintClicked(false);
        setIsMintAnotherClicked(false);
      } catch (err) {
        if (err.message.includes('User Cancelled')) {
          VIToast.error('User Cancelled Signing');
          ReactGA.event({
            category: 'User Cancelation',
            action: 'Mint',
            label: `${entityInfo.publicKey}: User Cancelled Signing`,
          });
        } else {
          VIToast.error(err.message);
          ReactGA.event({
            category: 'Error',
            action: 'Mint',
            label: `${entityInfo.publicKey}: ${err.message}`,
          });
        }
        setIsMintClicked(false);
        setIsMintAnotherClicked(false);
      }

      setState({
        inputs: {
          title: '',
          description: '',
          price: '',
          isForSale: false,
          category: '',
          currency: '',
          beneficiaryPercentage: '',
          isImageURL: false,
        },
      });
      refreshAuth();
    }
  }

  const setCampaignSelectedData = (allCampaigns, value) => {
    setCampaign(value ? value : undefined);
    let filteredCampaigns;
    if (allCampaigns?.length) {
      filteredCampaigns = allCampaigns.find((c) => c.id === value);
      setCreatorPercentage(100 - filteredCampaigns.requested_royalty);
      setBeneficiaryPercentage(filteredCampaigns.requested_royalty);
    }
    filteredCampaigns &&
      setSDGsGoalsData(
        SDGsData.filter((sdg) =>
          filteredCampaigns?.sdgs_ids?.split(',').includes(sdg.value.toString())
        )
      );
  };

  const checkURLValidation = (value) => {
    if (validator.isURL(value)) {
      setShowURLErrorMsg(false);
    } else {
      setShowURLErrorMsg(true);
    }
  };

  return (
    <Layout>
      <div className='page-content bg-white'>
        {/* <!-- inner page banner --> */}
        <div
          className='dlab-bnr-inr overlay-primary bg-pt'
          style={{ backgroundImage: 'url(' + bnr1 + ')' }}
        >
          <PageTitle motherMenu='Mint NFT' activeMenu='Mint NFT' />
        </div>
        {/* <!-- inner page banner END --> */}
        {/* <!-- contact area --> */}
        {!isLoggedIn ? (
          <PromptLogin />
        ) : (
          <div className='section-full content-inner shop-account'>
            {/* <!-- Product --> */}
            <div className='container'>
              <div>
                <div className=' m-auto m-b30'>
                  <Container>
                    <Row>
                      <Col>
                        <Row className='form-group'>
                          <Col>
                            <label>
                              Select Beneficiary{' '}
                              <span className='text-danger'>*</span>
                            </label>
                            {beneficiaries ? (
                              <select
                                name='beneficiary'
                                placeholder='Beneficiary'
                                className='form-control'
                                onChange={(e) => {
                                  handleChange(e, true);
                                  setBeneficiary(e.target.value);
                                }}
                                value={beneficiary}
                              >
                                {beneficiaries
                                  ?.filter(
                                    ({ isApproved }) => isApproved === 'true'
                                  )
                                  .map(({ username, address }, index) => (
                                    <option
                                      key={`${address}_${index}`}
                                      value={address}
                                    >
                                      {username}
                                    </option>
                                  ))}
                              </select>
                            ) : (
                              <label className='d-block vinft-bg-gray'>
                                <Spinner
                                  animation='border'
                                  variant='dark'
                                  className='my-1'
                                />
                              </label>
                            )}
                          </Col>
                        </Row>
                        <Row className='form-group'>
                          <Col>
                            <label>
                              Select Campaign{' '}
                              <span className='text-danger'>*</span>
                            </label>
                            {campaignsList ? (
                              <select
                                name='campaign'
                                placeholder='Campaign'
                                className='form-control'
                                onChange={(e) =>
                                  setCampaignSelectedData(
                                    campaigns,
                                    e.target.value
                                  )
                                }
                                value={campaign}
                              >
                                {campaignsList?.map(
                                  ({ name, id, requested_royalty }) => (
                                    <option key={id} value={id}>
                                      {name} (creator Percentage is{' '}
                                      {100 - requested_royalty})
                                    </option>
                                  )
                                )}
                              </select>
                            ) : (
                              <label className='d-block vinft-bg-gray'>
                                <Spinner
                                  animation='border'
                                  variant='dark'
                                  className='my-1'
                                />
                              </label>
                            )}
                          </Col>
                        </Row>
                        <Row className='form-group'>
                          <Col>
                            <label>
                              Select Existing Collection or Create new one{' '}
                              <span className='text-danger'>*</span>
                            </label>

                            {collectionsList || !isCreatorExist ? (
                              <CreatableSelect
                                isClearable
                                isLoading={isLoading}
                                onChange={(v) => setSelectedCollectionValue(v)}
                                onCreateOption={(v) => handleCreate(v)}
                                options={collectionsList}
                                value={selectedCollectionValue}
                                menuPortalTarget={document.body}
                                placeholder='Select...'
                                className='creatable-select'
                                formatCreateLabel={(v) =>
                                  'Click here to create "' + v + '" Collection'
                                }
                              />
                            ) : (
                              <label className='d-block vinft-bg-gray'>
                                <Spinner
                                  animation='border'
                                  variant='dark'
                                  className='my-1'
                                />
                              </label>
                            )}
                          </Col>
                        </Row>
                        <Row className='form-group'>
                          <Col>
                            <label>
                              Please enter your creator name the name can not be
                              changed <span className='text-danger'>*</span>
                            </label>
                            <input
                              type='text'
                              placeholder='Creator'
                              name='creator'
                              className='form-control'
                              onChange={(e) => setCreator(e.target.value)}
                              value={creator || ''}
                              disabled={isCreatorExist}
                            />
                          </Col>
                        </Row>
                        <Row className='form-group'>
                          <Col>
                            <div className='required-field vinft-bg-gray'>
                              <input
                                type='text'
                                placeholder='NFT Name'
                                name='name'
                                className='form-control'
                                onChange={(e) => handleChange(e)}
                                value={state.inputs.name}
                              />{' '}
                              <span className='text-danger required-field-symbol'>
                                *
                              </span>
                            </div>
                          </Col>
                        </Row>
                      </Col>
                      <Col>
                        <Row className='form-group'>
                          {/* <Col>
                            <Form.Check
                              type={'checkbox'}
                              id={'isImageURL'}
                              label={`Already hosted image, enter direct url ?`}
                              onChange={(e) => handleChange(e)}
                              value={state.inputs.isImageURL}
                              name='isImageURL'
                              className='float-left'
                            />{' '}
                            <span className='text-danger'>*</span>
                          </Col> */}
                        </Row>
                        <Row className='form-group'>
                          <Col>
                            {state.inputs.isImageURL ? (
                              <>
                                {' '}
                                <input
                                  type='text'
                                  placeholder='Image URl'
                                  name='imageUrl'
                                  className='form-control'
                                  onChange={(e) => {
                                    // setUploadedImage(e.target.value);
                                    setUploadedBlobImage(e.target.value);
                                    checkURLValidation(e.target.value);
                                  }}
                                  value={
                                    uploadedImageURL === ''
                                      ? null
                                      : uploadedImageURL
                                  }
                                />
                                {showURLErrorMsg && (
                                  <span className='text-danger'>
                                    Please enter Valid URL{' '}
                                  </span>
                                )}
                              </>
                            ) : (
                              <ImageUploader
                                singleImage
                                ref={pictureElement}
                                withIcon={true}
                                buttonText='Choose image'
                                onChange={onDrop}
                                imgExtension={['.jpg', '.gif', '.png']}
                                maxFileSize={20209230}
                                withPreview={true}
                                label={
                                  'Max file size: 20mb, accepted: jpg|gif|png'
                                }
                              />
                            )}
                          </Col>
                        </Row>
                      </Col>
                    </Row>
                    {SDGsGoalsData.length > 0 && (
                      <Row className='form-group'>
                        <Col>
                          <SDGsMultiSelect
                            data={SDGsGoalsData}
                            SDGsChanged={(selectedData) => {
                              handleSDGsChange(selectedData);
                            }}
                            isClear={isClearSDGs}
                          />
                        </Col>
                      </Row>
                    )}
                    <Row className='form-group'>
                      <Col>
                        <Form.Check
                          type={'checkbox'}
                          id={'isForSale'}
                          label={`Is For Sale`}
                          onChange={(e) => handleChange(e)}
                          value={state.inputs.isForSale}
                          name='isForSale'
                          checked={state.inputs.isForSale}
                        />
                      </Col>
                    </Row>
                    <Row className='form-group'>
                      <Col>
                      <div className='required-field'>
                        <Form.Check
                          type={'checkbox'}
                          id={'isAuthorBeneficiary'}
                          label={`I authorize the donation of this NFT for the selected beneficiary campaign.`}
                          onChange={(e) => {
                            handleChange(e)
                          }}
                          value={state.inputs.isAuthorBeneficiary}
                          name='isAuthorBeneficiary'
                          checked={state.inputs.isAuthorBeneficiary}
                        />
                        {!state.inputs.isAuthorBeneficiary && (
                          <span className='text-danger required-field-symbol'>
                            *
                          </span>
                        )}
                        </div>
                      </Col>
                    </Row>
                    {state.inputs.isForSale && (
                      <>
                        <Row className='form-group'>
                          <Col>
                            <div className='required-field'>
                              <input
                                type='number'
                                placeholder='Price'
                                name='price'
                                className='form-control'
                                onChange={(e) => handleChange(e)}
                                value={state.inputs.price}
                                min={0}
                              />
                              {state.inputs.isForSale && (
                                <span className='text-danger required-field-symbol'>
                                  *
                                </span>
                              )}
                              {state.inputs.isForSale &&
                                state.inputs.price !== '' &&
                                state.inputs.price < 250 && (
                                  <span className='text-danger'>
                                    NFT price should be more than 250 CSPR
                                  </span>
                                )}
                            </div>
                          </Col>
                          <Col>
                            <div className='required-field'>
                              <select
                                placeholder='Currency'
                                name='currency'
                                className='form-control'
                                onChange={(e) => handleChange(e)}
                                value={state.inputs.currency}
                              >
                                <option value={'CSPR'}>CSPR</option>
                              </select>
                              {state.inputs.isForSale && (
                                <span className='text-danger required-field-symbol'>
                                  *
                                </span>
                              )}
                            </div>
                          </Col>
                        </Row>
                      </>
                    )}
                    <Row className='form-group'>
                      <Col>
                        <textarea
                          rows={4}
                          name='description'
                          placeholder='NFT Description'
                          className='form-control'
                          onChange={(e) => handleChange(e)}
                          value={state.inputs.description}
                        ></textarea>
                      </Col>
                    </Row>
                    <Row className='form-group'>
                      <Col>
                        <p className='form-submit'>
                          <button
                            type='button'
                            className='btn btn-success mr-2'
                            name='submit'
                            onClick={() => mintNFT(false)}
                            disabled={
                              beneficiary === '' ||
                              campaign === '' ||
                              campaign === undefined ||
                              selectedCollectionValue === {} ||
                              selectedCollectionValue === undefined ||
                              selectedCollectionValue === null ||
                              selectedCollectionValue?.value === '' ||
                              creator === '' ||
                              state.inputs.name === '' ||
                              (state.inputs.isForSale &&
                                (state.inputs.price === '' ||
                                  state.inputs.price < 250)) ||
                              isMintClicked ||
                              isMintAnotherClicked ||
                              !uploadedImageBlob ||
                              (SDGsGoalsData.length > 0 &&
                                SDGsGoals.length <= 0)||
                                !state.inputs.isAuthorBeneficiary
                            }
                          >
                            {isMintClicked ? (
                              <Spinner animation='border' variant='light' />
                            ) : (
                              'Mint'
                            )}
                          </button>
                          <button
                            type='button'
                            className='btn btn-success'
                            name='submit'
                            onClick={() => mintNFT(true)}
                            disabled={
                              beneficiary === '' ||
                              campaign === '' ||
                              campaign === undefined ||
                              selectedCollectionValue === {} ||
                              selectedCollectionValue === undefined ||
                              selectedCollectionValue === null ||
                              selectedCollectionValue?.value === '' ||
                              creator === '' ||
                              state.inputs.name === '' ||
                              (state.inputs.isForSale &&
                                (state.inputs.price === '' ||
                                  state.inputs.price < 250)) ||
                              isMintAnotherClicked ||
                              !uploadedImageBlob ||
                              isMintClicked ||
                              (SDGsGoalsData.length > 0 &&
                                SDGsGoals.length <= 0)||
                                !state.inputs.isAuthorBeneficiary
                            }
                          >
                            {isMintAnotherClicked ? (
                              <Spinner animation='border' variant='light' />
                            ) : (
                              'Mint another NFT'
                            )}
                          </button>
                        </p>
                      </Col>
                    </Row>
                  </Container>
                </div>
              </div>
            </div>
            {/* <!-- Product END --> */}
          </div>
        )}

        {/* <!-- contact area  END --> */}
      </div>
    </Layout>
  );
};

export default MintNFT;
